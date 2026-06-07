import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/db.js';
import { calcLine } from '../lib/money.js';
import { canCancelInvoice, validateInvoiceInTransaction } from '../services/invoiceValidate.js';
import { InsufficientStockError, reverseStockOnInvoiceCancel } from '../services/stockLedger.js';
import { streamInvoicePdf } from '../services/pdfInvoice.js';
import { buildInvoicePdfInputFromRecord } from '../services/invoicePdfPayload.js';
import { computeNetToPay } from '../lib/invoiceTotals.js';
import {
  documentLanguageSchema,
  fromPrismaDocumentLanguage,
  toPrismaDocumentLanguage,
} from '../lib/documentLanguage.js';
import {
  formatCreditNoteLineDescription,
  formatCreditNoteNotes,
} from '../lib/documentPdfLabels.js';

const router = Router();
const orgId = (req: Express.Request) => req.user!.organizationId!;

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceHt: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
  productId: z.string().optional().nullable(),
});

const statusFilter = ['DRAFT', 'VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] as const;

const einvoiceMetaSchema = {
  operationNature: z.enum(['GOODS', 'SERVICES', 'MIXED']).optional(),
  vatOnDebits: z.boolean().optional(),
  useDifferentDeliveryAddress: z.boolean().optional(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryPostalCode: z.string().optional().nullable(),
  deliveryCity: z.string().optional().nullable(),
  deliveryCountry: z.string().length(2).optional().nullable(),
};

const createSchema = z.object({
  clientId: z.string(),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  currency: z.string().length(3).optional(),
  applyVat: z.boolean().optional(),
  applyFiscalStamp: z.boolean().optional(),
  fiscalStamp: z.number().nonnegative().optional(),
  discountEnabled: z.boolean().optional(),
  discountRate: z.number().min(0).max(100).optional(),
  showCurrencyOnLines: z.boolean().optional(),
  documentLanguage: z.enum(documentLanguageSchema).optional(),
  kind: z.enum(['STANDARD', 'DEPOSIT']).optional(),
  appliedDepositId: z.string().nullable().optional(),
  lines: z.array(lineSchema).min(1),
  ...einvoiceMetaSchema,
});

const updateSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  currency: z.string().length(3).optional(),
  applyVat: z.boolean().optional(),
  applyFiscalStamp: z.boolean().optional(),
  fiscalStamp: z.number().nonnegative().optional(),
  discountEnabled: z.boolean().optional(),
  discountRate: z.number().min(0).max(100).optional(),
  showCurrencyOnLines: z.boolean().optional(),
  documentLanguage: z.enum(documentLanguageSchema).optional(),
  kind: z.enum(['STANDARD', 'DEPOSIT']).optional(),
  appliedDepositId: z.string().nullable().optional(),
  lines: z.array(lineSchema).min(1).optional(),
  ...einvoiceMetaSchema,
});

function einvoiceDataFromInput(input: {
  operationNature?: 'GOODS' | 'SERVICES' | 'MIXED';
  vatOnDebits?: boolean;
  useDifferentDeliveryAddress?: boolean;
  deliveryAddress?: string | null;
  deliveryPostalCode?: string | null;
  deliveryCity?: string | null;
  deliveryCountry?: string | null;
}) {
  return {
    ...(input.operationNature !== undefined ? { operationNature: input.operationNature } : {}),
    ...(input.vatOnDebits !== undefined ? { vatOnDebits: input.vatOnDebits } : {}),
    ...(input.useDifferentDeliveryAddress !== undefined
      ? { useDifferentDeliveryAddress: input.useDifferentDeliveryAddress }
      : {}),
    ...(input.deliveryAddress !== undefined
      ? { deliveryAddress: input.deliveryAddress?.trim() || null }
      : {}),
    ...(input.deliveryPostalCode !== undefined
      ? { deliveryPostalCode: input.deliveryPostalCode?.trim() || null }
      : {}),
    ...(input.deliveryCity !== undefined
      ? { deliveryCity: input.deliveryCity?.trim() || null }
      : {}),
    ...(input.deliveryCountry !== undefined
      ? { deliveryCountry: input.deliveryCountry?.trim()?.toUpperCase() || null }
      : {}),
  };
}

router.get('/deposits/available', async (req, res) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;
  const list = await prisma.invoice.findMany({
    where: {
      organizationId: orgId(req),
      kind: 'DEPOSIT',
      status: { in: ['VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID'] },
      ...(clientId ? { clientId } : {}),
      depositApplications: { none: {} },
    },
    select: {
      id: true,
      number: true,
      clientId: true,
      totalTtc: true,
      netToPay: true,
      currency: true,
      issueDate: true,
      client: { select: { name: true } },
    },
    orderBy: [{ issueDate: 'desc' }],
  });
  return res.json(list);
});

router.get('/', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const list = await prisma.invoice.findMany({
    where: {
      organizationId: orgId(req),
      ...(status && statusFilter.includes(status as (typeof statusFilter)[number])
        ? { status: status as (typeof statusFilter)[number] }
        : {}),
    },
    include: { client: { select: { id: true, name: true, email: true } } },
    orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
  });
  return res.json(list);
});

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }
  const input = parsed.data;
  const client = await prisma.client.findFirst({
    where: { id: input.clientId, organizationId: orgId(req) },
  });
  if (!client) return res.status(400).json({ error: 'Client invalide' });

  const applyVat = input.applyVat ?? true;
  const applyFiscalStamp = input.applyFiscalStamp ?? false;
  const fiscalStamp = new Prisma.Decimal(input.fiscalStamp ?? 1);
  const discountEnabled = input.discountEnabled ?? false;
  const discountRate = new Prisma.Decimal(input.discountRate ?? 0);
  const discountFactor = new Prisma.Decimal(1).minus(discountEnabled ? discountRate.div(100) : 0);

  const lineCreates = input.lines.map((l, idx) => {
    const effectiveTaxRate = applyVat ? l.taxRate : 0;
    const { lineTotalHt, lineVat, lineTotalTtc } = calcLine(
      l.quantity,
      l.unitPriceHt,
      effectiveTaxRate
    );
    const discountedHt = lineTotalHt
      .mul(discountFactor)
      .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
    const discountedVat = lineVat
      .mul(discountFactor)
      .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
    const discountedTtc = lineTotalTtc
      .mul(discountFactor)
      .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
    return {
      description: l.description,
      quantity: new Prisma.Decimal(l.quantity),
      unitPriceHt: new Prisma.Decimal(l.unitPriceHt),
      taxRate: new Prisma.Decimal(effectiveTaxRate),
      lineTotalHt: discountedHt,
      lineVat: discountedVat,
      lineTotalTtc: discountedTtc,
      sortOrder: idx,
      productId: l.productId ?? undefined,
    };
  });
  let sub = new Prisma.Decimal(0);
  let vat = new Prisma.Decimal(0);
  let ttc = new Prisma.Decimal(0);
  for (const l of lineCreates) {
    sub = sub.add(l.lineTotalHt);
    vat = vat.add(l.lineVat);
    ttc = ttc.add(l.lineTotalTtc);
  }
  if (applyFiscalStamp) ttc = ttc.add(fiscalStamp);
  const tps = applyVat ? sub.mul(new Prisma.Decimal('0.05')).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP) : new Prisma.Decimal(0);
  const tvq = applyVat ? sub.mul(new Prisma.Decimal('0.09975')).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP) : new Prisma.Decimal(0);

  const kind = input.kind ?? 'STANDARD';
  let advanceDeduction = new Prisma.Decimal(0);
  let appliedDepositId: string | undefined;

  if (kind === 'STANDARD' && input.appliedDepositId) {
    const deposit = await prisma.invoice.findFirst({
      where: {
        id: input.appliedDepositId,
        organizationId: orgId(req),
        kind: 'DEPOSIT',
        clientId: input.clientId,
        status: { in: ['VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID'] },
        depositApplications: { none: {} },
      },
    });
    if (!deposit) {
      return res.status(400).json({ error: 'Facture d’acompte invalide ou déjà utilisée' });
    }
    advanceDeduction = deposit.totalTtc;
    appliedDepositId = deposit.id;
  }

  const netToPay = computeNetToPay(ttc, advanceDeduction);

  const inv = await prisma.invoice.create({
    data: {
      organizationId: orgId(req),
      clientId: input.clientId,
      number: null,
      kind,
      appliedDepositId,
      advanceDeduction,
      netToPay,
      issueDate: input.issueDate,
      dueDate: input.dueDate ?? undefined,
      notes: input.notes ?? undefined,
      currency: input.currency ?? 'CAD',
      applyVat,
      applyFiscalStamp,
      fiscalStamp,
      discountEnabled,
      discountRate,
      showCurrencyOnLines: input.showCurrencyOnLines ?? true,
      documentLanguage: toPrismaDocumentLanguage(input.documentLanguage ?? 'fr'),
      status: 'DRAFT',
      subtotalHt: sub,
      vatTotal: vat,
      tpsAmount: tps,
      tvqAmount: tvq,
      totalTtc: ttc,
      ...einvoiceDataFromInput(input),
      lines: { create: lineCreates },
    },
    include: { lines: true, client: true },
  });
  return res.status(201).json(inv);
});

router.get('/:id/pdf', async (req, res) => {
  const inv = await prisma.invoice.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
    include: {
      client: true,
      organization: true,
      appliedDeposit: { select: { number: true } },
      creditedInvoice: { select: { number: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!inv) return res.status(404).json({ error: 'Introuvable' });

  streamInvoicePdf(res, buildInvoicePdfInputFromRecord(inv));
});

router.post('/:id/validate', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await prisma.$transaction((tx) =>
      validateInvoiceInTransaction(tx, { invoiceId: id, organizationId: orgId(req) })
    );
    return res.json(result);
  } catch (e: unknown) {
    if (e instanceof InsufficientStockError) {
      return res.status(400).json({
        error: 'Stock insuffisant pour valider cette facture',
        code: e.code,
        items: e.items,
      });
    }
    const code = e instanceof Error ? e.message : '';
    if (code === 'NOT_FOUND') return res.status(404).json({ error: 'Introuvable' });
    if (code === 'NOT_DRAFT')
      return res.status(400).json({ error: 'Validation réservée aux brouillons sans numéro' });
    if (code === 'HAS_NUMBER') return res.status(400).json({ error: 'Numéro déjà présent' });
    if (code === 'ORG_NOT_FOUND')
      return res.status(404).json({ error: 'Organisation introuvable' });
    throw e;
  }
});

router.post('/:id/cancel', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  if (!canCancelInvoice(existing.status)) {
    return res.status(400).json({
      error:
        'Annulation impossible pour ce statut (réservé aux factures validées / envoyées / partiellement payées)',
    });
  }
  try {
    const inv = await prisma.$transaction(async (tx) => {
      await reverseStockOnInvoiceCancel(tx, {
        invoiceId: id,
        organizationId: orgId(req),
      });
      return tx.invoice.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          lines: { orderBy: { sortOrder: 'asc' } },
          client: true,
          organization: true,
          payments: { orderBy: { paymentDate: 'desc' } },
        },
      });
    });
    return res.json(inv);
  } catch (e: unknown) {
    if (e instanceof InsufficientStockError) {
      return res.status(400).json({
        error: 'Stock insuffisant pour annuler (réintégration impossible)',
        code: e.code,
        items: e.items,
      });
    }
    throw e;
  }
});

/** Copie en brouillon (mêmes lignes et montants, sans numéro ni lien devis). */
router.post('/:id/duplicate', async (req, res) => {
  const id = req.params.id;
  const source = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId(req) },
    include: { lines: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!source) return res.status(404).json({ error: 'Introuvable' });
  if (source.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Impossible de dupliquer une facture annulée' });
  }

  const inv = await prisma.invoice.create({
    data: {
      organizationId: source.organizationId,
      clientId: source.clientId,
      issueDate: new Date(),
      dueDate: source.dueDate,
      notes: source.notes,
      currency: source.currency,
      operationNature: source.operationNature,
      vatOnDebits: source.vatOnDebits,
      useDifferentDeliveryAddress: source.useDifferentDeliveryAddress,
      deliveryAddress: source.deliveryAddress,
      deliveryPostalCode: source.deliveryPostalCode,
      deliveryCity: source.deliveryCity,
      deliveryCountry: source.deliveryCountry,
      status: 'DRAFT',
      subtotalHt: source.subtotalHt,
      vatTotal: source.vatTotal,
      totalTtc: source.totalTtc,
      lines: {
        create: source.lines.map((l, idx) => ({
          description: l.description,
          quantity: l.quantity,
          unitPriceHt: l.unitPriceHt,
          taxRate: l.taxRate,
          lineTotalHt: l.lineTotalHt,
          lineVat: l.lineVat,
          lineTotalTtc: l.lineTotalTtc,
          sortOrder: idx,
          productId: l.productId,
        })),
      },
    },
    include: { lines: true, client: { select: { id: true, name: true, email: true } } },
  });
  return res.status(201).json(inv);
});

/** Crée un avoir (note de crédit) lié à une facture validée. */
router.post('/:id/credit-note', async (req, res) => {
  const sourceId = req.params.id;
  const source = await prisma.invoice.findFirst({
    where: { id: sourceId, organizationId: orgId(req), kind: 'STANDARD' },
    include: {
      lines: { orderBy: { sortOrder: 'asc' } },
      creditNote: { select: { id: true, number: true } },
    },
  });
  if (!source) return res.status(404).json({ error: 'Facture introuvable' });
  if (!['VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID'].includes(source.status)) {
    return res.status(400).json({
      error: 'Un avoir ne peut être créé que pour une facture validée ou envoyée',
    });
  }
  if (source.creditNote) {
    return res.status(400).json({ error: 'Un avoir existe déjà pour cette facture' });
  }

  const lang = fromPrismaDocumentLanguage(source.documentLanguage);
  const notes = formatCreditNoteNotes(source.notes, source.number ?? sourceId, lang);

  const inv = await prisma.invoice.create({
    data: {
      organizationId: source.organizationId,
      clientId: source.clientId,
      creditedInvoiceId: source.id,
      kind: 'CREDIT_NOTE',
      number: null,
      advanceDeduction: 0,
      netToPay: source.totalTtc,
      issueDate: new Date(),
      dueDate: source.dueDate,
      notes,
      currency: source.currency,
      applyVat: source.applyVat,
      applyFiscalStamp: source.applyFiscalStamp,
      fiscalStamp: source.fiscalStamp,
      discountEnabled: source.discountEnabled,
      discountRate: source.discountRate,
      showCurrencyOnLines: source.showCurrencyOnLines,
      documentLanguage: source.documentLanguage,
      operationNature: source.operationNature,
      vatOnDebits: source.vatOnDebits,
      useDifferentDeliveryAddress: source.useDifferentDeliveryAddress,
      deliveryAddress: source.deliveryAddress,
      deliveryPostalCode: source.deliveryPostalCode,
      deliveryCity: source.deliveryCity,
      deliveryCountry: source.deliveryCountry,
      status: 'DRAFT',
      subtotalHt: source.subtotalHt,
      vatTotal: source.vatTotal,
      totalTtc: source.totalTtc,
      lines: {
        create: source.lines.map((l, idx) => ({
          description: formatCreditNoteLineDescription(l.description, lang),
          quantity: l.quantity,
          unitPriceHt: l.unitPriceHt,
          taxRate: l.taxRate,
          lineTotalHt: l.lineTotalHt,
          lineVat: l.lineVat,
          lineTotalTtc: l.lineTotalTtc,
          sortOrder: idx,
          productId: l.productId,
        })),
      },
    },
    include: {
      lines: true,
      client: { select: { id: true, name: true, email: true } },
      creditedInvoice: { select: { id: true, number: true } },
    },
  });
  return res.status(201).json(inv);
});

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED']),
});

router.patch('/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Statut invalide' });
  const id = req.params.id;
  const existing = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  const next = parsed.data.status;
  if (next === 'VALIDATED') {
    return res.status(400).json({
      error: 'Utilisez POST /api/invoices/:id/validate pour valider et attribuer le numéro',
    });
  }
  if (existing.status === 'DRAFT' && !existing.number) {
    if (next !== 'DRAFT' && next !== 'CANCELLED') {
      return res.status(400).json({
        error:
          'Validez d’abord la facture (POST /api/invoices/:id/validate) avant de changer le statut',
      });
    }
  }
  const inv = await prisma.invoice.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return res.json(inv);
});

router.get('/:id', async (req, res) => {
  const inv = await prisma.invoice.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
    include: {
      client: true,
      organization: true,
      appliedDeposit: { select: { id: true, number: true, totalTtc: true } },
      creditedInvoice: { select: { id: true, number: true, issueDate: true } },
      creditNote: { select: { id: true, number: true, status: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
      payments: { orderBy: { paymentDate: 'desc' } },
      einvoiceTransmissions: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!inv) return res.status(404).json({ error: 'Introuvable' });
  return res.json(inv);
});

router.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const id = req.params.id;
  const existing = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  if (existing.status !== 'DRAFT') {
    return res.status(400).json({ error: 'Modification réservée aux brouillons' });
  }

  const { lines, appliedDepositId, kind, ...meta } = parsed.data;
  const metaData: Record<string, unknown> = {};
  if (meta.clientId !== undefined) metaData.clientId = meta.clientId;
  if (meta.issueDate !== undefined) metaData.issueDate = meta.issueDate;
  if (meta.dueDate !== undefined) metaData.dueDate = meta.dueDate;
  if (meta.notes !== undefined) metaData.notes = meta.notes;
  if (meta.currency !== undefined) metaData.currency = meta.currency;
  if (meta.applyVat !== undefined) metaData.applyVat = meta.applyVat;
  if (meta.applyFiscalStamp !== undefined) metaData.applyFiscalStamp = meta.applyFiscalStamp;
  if (meta.fiscalStamp !== undefined) metaData.fiscalStamp = new Prisma.Decimal(meta.fiscalStamp);
  if (meta.discountEnabled !== undefined) metaData.discountEnabled = meta.discountEnabled;
  if (meta.discountRate !== undefined)
    metaData.discountRate = new Prisma.Decimal(meta.discountRate);
  if (meta.showCurrencyOnLines !== undefined)
    metaData.showCurrencyOnLines = meta.showCurrencyOnLines;
  if (meta.documentLanguage !== undefined)
    metaData.documentLanguage = toPrismaDocumentLanguage(meta.documentLanguage);
  if (kind !== undefined) metaData.kind = kind;
  Object.assign(metaData, einvoiceDataFromInput(meta));

  const effectiveKind = kind ?? existing.kind;
  const effectiveClientId = meta.clientId ?? existing.clientId;
  let advanceDeduction = existing.advanceDeduction;
  let resolvedAppliedDepositId: string | null | undefined = appliedDepositId;

  if (appliedDepositId !== undefined) {
    if (effectiveKind === 'DEPOSIT') {
      return res
        .status(400)
        .json({ error: 'Une facture d’acompte ne peut pas déduire un acompte' });
    }
    if (appliedDepositId === null) {
      advanceDeduction = new Prisma.Decimal(0);
      resolvedAppliedDepositId = null;
    } else {
      const deposit = await prisma.invoice.findFirst({
        where: {
          id: appliedDepositId,
          organizationId: orgId(req),
          kind: 'DEPOSIT',
          clientId: effectiveClientId,
          status: { in: ['VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID'] },
          OR: [{ depositApplications: { none: {} } }, { depositApplications: { some: { id } } }],
        },
      });
      if (!deposit) {
        return res.status(400).json({ error: 'Facture d’acompte invalide ou déjà utilisée' });
      }
      advanceDeduction = deposit.totalTtc;
      resolvedAppliedDepositId = deposit.id;
    }
    metaData.appliedDepositId = resolvedAppliedDepositId;
    metaData.advanceDeduction = advanceDeduction;
  }

  if (lines) {
    const applyVat = meta.applyVat ?? existing.applyVat;
    const applyFiscalStamp = meta.applyFiscalStamp ?? existing.applyFiscalStamp;
    const fiscalStamp =
      meta.fiscalStamp !== undefined ? new Prisma.Decimal(meta.fiscalStamp) : existing.fiscalStamp;
    const discountEnabled = meta.discountEnabled ?? existing.discountEnabled;
    const discountRate =
      meta.discountRate !== undefined
        ? new Prisma.Decimal(meta.discountRate)
        : existing.discountRate;
    const discountFactor = new Prisma.Decimal(1).minus(discountEnabled ? discountRate.div(100) : 0);

    const lineCreates = lines.map((l, idx) => {
      const effectiveTaxRate = applyVat ? l.taxRate : 0;
      const { lineTotalHt, lineVat, lineTotalTtc } = calcLine(
        l.quantity,
        l.unitPriceHt,
        effectiveTaxRate
      );
      const discountedHt = lineTotalHt
        .mul(discountFactor)
        .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
      const discountedVat = lineVat
        .mul(discountFactor)
        .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
      const discountedTtc = lineTotalTtc
        .mul(discountFactor)
        .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
      return {
        description: l.description,
        quantity: new Prisma.Decimal(l.quantity),
        unitPriceHt: new Prisma.Decimal(l.unitPriceHt),
        taxRate: new Prisma.Decimal(effectiveTaxRate),
        lineTotalHt: discountedHt,
        lineVat: discountedVat,
        lineTotalTtc: discountedTtc,
        sortOrder: idx,
        productId: l.productId ?? undefined,
      };
    });
    let sub = new Prisma.Decimal(0);
    let vat = new Prisma.Decimal(0);
    let ttc = new Prisma.Decimal(0);
    for (const l of lineCreates) {
      sub = sub.add(l.lineTotalHt);
      vat = vat.add(l.lineVat);
      ttc = ttc.add(l.lineTotalTtc);
    }
    if (applyFiscalStamp) ttc = ttc.add(fiscalStamp);
    const tpsUpd = applyVat ? sub.mul(new Prisma.Decimal('0.05')).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP) : new Prisma.Decimal(0);
    const tvqUpd = applyVat ? sub.mul(new Prisma.Decimal('0.09975')).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP) : new Prisma.Decimal(0);

    if (
      appliedDepositId === undefined &&
      effectiveKind === 'STANDARD' &&
      existing.appliedDepositId
    ) {
      advanceDeduction = existing.advanceDeduction;
    } else if (effectiveKind === 'DEPOSIT') {
      advanceDeduction = new Prisma.Decimal(0);
      metaData.appliedDepositId = null;
    }

    const netToPay = computeNetToPay(ttc, advanceDeduction);

    await prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });
    const inv = await prisma.invoice.update({
      where: { id },
      data: {
        ...metaData,
        subtotalHt: sub,
        vatTotal: vat,
        tpsAmount: tpsUpd,
        tvqAmount: tvqUpd,
        totalTtc: ttc,
        netToPay,
        advanceDeduction,
        lines: { create: lineCreates },
      },
      include: {
        lines: true,
        client: true,
        appliedDeposit: { select: { id: true, number: true } },
      },
    });
    return res.json(inv);
  }

  if (appliedDepositId !== undefined) {
    const netToPay = computeNetToPay(existing.totalTtc, advanceDeduction);
    metaData.netToPay = netToPay;
  }

  const inv = await prisma.invoice.update({
    where: { id },
    data: metaData,
    include: { lines: true, client: true, appliedDeposit: { select: { id: true, number: true } } },
  });
  return res.json(inv);
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.invoice.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  if (existing.status !== 'DRAFT') {
    return res.status(400).json({ error: 'Suppression réservée aux brouillons' });
  }
  await prisma.invoice.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
