import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/index.js';
import { APP_BRAND } from '../lib/appBrand.js';
import { prisma } from '../lib/db.js';
import { calcLine } from '../lib/money.js';
import { convertQuoteToInvoiceDraft } from '../services/quoteConvert.js';
import { streamQuotePdf } from '../services/pdfQuote.js';
import { validateQuoteInTransaction } from '../services/quoteValidate.js';
import {
  documentLanguageSchema,
  fromPrismaDocumentLanguage,
  toPrismaDocumentLanguage,
} from '../lib/documentLanguage.js';
import { getDocumentPdfLabels } from '../lib/documentPdfLabels.js';
import { resolvePdfAccent } from '../lib/pdfTheme.js';

const router = Router();
const orgId = (req: Express.Request) => req.user!.organizationId!;

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceHt: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
  productId: z.string().optional().nullable(),
});

const statusFilter = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'] as const;

const createSchema = z.object({
  clientId: z.string(),
  issueDate: z.coerce.date(),
  validUntil: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  currency: z.string().length(3).optional(),
  applyVat: z.boolean().optional(),
  applyFiscalStamp: z.boolean().optional(),
  fiscalStamp: z.number().nonnegative().optional(),
  discountEnabled: z.boolean().optional(),
  discountRate: z.number().min(0).max(100).optional(),
  showCurrencyOnLines: z.boolean().optional(),
  documentLanguage: z.enum(documentLanguageSchema).optional(),
  lines: z.array(lineSchema).min(1),
});

const updateSchema = z.object({
  clientId: z.string().optional(),
  issueDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  currency: z.string().length(3).optional(),
  applyVat: z.boolean().optional(),
  applyFiscalStamp: z.boolean().optional(),
  fiscalStamp: z.number().nonnegative().optional(),
  discountEnabled: z.boolean().optional(),
  discountRate: z.number().min(0).max(100).optional(),
  showCurrencyOnLines: z.boolean().optional(),
  documentLanguage: z.enum(documentLanguageSchema).optional(),
  lines: z.array(lineSchema).min(1).optional(),
});

router.get('/', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const list = await prisma.quote.findMany({
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

  const q = await prisma.quote.create({
    data: {
      organizationId: orgId(req),
      clientId: input.clientId,
      number: null,
      issueDate: input.issueDate,
      validUntil: input.validUntil ?? undefined,
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
      lines: { create: lineCreates },
    },
    include: { lines: true, client: true },
  });
  return res.status(201).json(q);
});

router.get('/:id/pdf', async (req, res) => {
  const q = await prisma.quote.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
    include: {
      client: true,
      organization: true,
      lines: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!q) return res.status(404).json({ error: 'Introuvable' });

  const pdfLabels = getDocumentPdfLabels(fromPrismaDocumentLanguage(q.documentLanguage));

  streamQuotePdf(res, {
    number: q.number ?? pdfLabels.draft,
    documentLanguage: fromPrismaDocumentLanguage(q.documentLanguage),
    issueDate: q.issueDate,
    validUntil: q.validUntil,
    notes: q.notes,
    currency: q.currency,
    template: q.organization.quotePdfTemplate,
    accentColor: resolvePdfAccent(q.organization, 'quote'),
    footerText: q.organization.documentFooterText,
    defaultFooterLine: `${APP_BRAND} — Devis généré automatiquement.`,
    org: {
      name: q.organization.name,
      logoUrl: q.organization.logoUrl,
      taxMatricule: q.organization.taxMatricule,
      address: q.organization.address,
      city: q.organization.city,
    },
    client: { name: q.client.name, taxId: q.client.taxId },
    lines: q.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity.toString(),
      unitPriceHt: l.unitPriceHt.toString(),
      taxRate: l.taxRate.toString(),
      lineTotalHt: l.lineTotalHt.toString(),
      lineVat: l.lineVat.toString(),
      lineTotalTtc: l.lineTotalTtc.toString(),
    })),
    subtotalHt: q.subtotalHt.toString(),
    vatTotal: q.vatTotal.toString(),
    totalTtc: q.totalTtc.toString(),
  });
});

router.post('/:id/validate', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await prisma.$transaction((tx) =>
      validateQuoteInTransaction(tx, { quoteId: id, organizationId: orgId(req) })
    );
    return res.json(result);
  } catch (e: unknown) {
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

router.post('/:id/convert-to-invoice', async (req, res) => {
  const id = req.params.id;
  try {
    const inv = await prisma.$transaction((tx) =>
      convertQuoteToInvoiceDraft(tx, { quoteId: id, organizationId: orgId(req) })
    );
    return res.status(201).json(inv);
  } catch (e: unknown) {
    const code = e instanceof Error ? e.message : '';
    if (code === 'NOT_FOUND') return res.status(404).json({ error: 'Introuvable' });
    if (code === 'NOT_ACCEPTED') {
      return res.status(400).json({ error: 'Conversion réservée aux devis acceptés' });
    }
    if (code === 'ALREADY_CONVERTED') {
      return res.status(400).json({ error: 'Ce devis a déjà été converti en facture' });
    }
    throw e;
  }
});

const statusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED']),
});

router.patch('/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Statut invalide' });
  const id = req.params.id;
  const existing = await prisma.quote.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  const next = parsed.data.status;
  if (next === 'SENT') {
    return res.status(400).json({
      error: 'Utilisez POST /api/quotes/:id/validate pour émettre le devis et attribuer le numéro',
    });
  }
  if (next === 'CONVERTED') {
    return res
      .status(400)
      .json({ error: 'Utilisez POST /api/quotes/:id/convert-to-invoice pour convertir' });
  }
  if (existing.status === 'DRAFT' && !existing.number) {
    if (next !== 'DRAFT') {
      return res.status(400).json({
        error:
          'Validez d’abord le devis (POST /api/quotes/:id/validate) avant de changer le statut',
      });
    }
  }
  if (existing.status === 'CONVERTED') {
    return res.status(400).json({ error: 'Devis converti : statut figé' });
  }
  if (next === 'DRAFT' && existing.status !== 'DRAFT') {
    return res.status(400).json({ error: 'Impossible de repasser un devis émis en brouillon' });
  }
  const q = await prisma.quote.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return res.json(q);
});

router.get('/:id', async (req, res) => {
  const q = await prisma.quote.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
    include: {
      client: true,
      organization: true,
      lines: { orderBy: { sortOrder: 'asc' } },
      convertedInvoice: { select: { id: true, number: true, status: true } },
    },
  });
  if (!q) return res.status(404).json({ error: 'Introuvable' });
  return res.json(q);
});

router.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const id = req.params.id;
  const existing = await prisma.quote.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  if (existing.status !== 'DRAFT') {
    return res.status(400).json({ error: 'Modification réservée aux brouillons' });
  }

  const { lines, ...meta } = parsed.data;
  const metaData: Record<string, unknown> = {};
  if (meta.clientId !== undefined) metaData.clientId = meta.clientId;
  if (meta.issueDate !== undefined) metaData.issueDate = meta.issueDate;
  if (meta.validUntil !== undefined) metaData.validUntil = meta.validUntil;
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

  if (lines) {
    const lineCreates = lines.map((l, idx) => {
      const { lineTotalHt, lineVat, lineTotalTtc } = calcLine(l.quantity, l.unitPriceHt, l.taxRate);
      return {
        description: l.description,
        quantity: new Prisma.Decimal(l.quantity),
        unitPriceHt: new Prisma.Decimal(l.unitPriceHt),
        taxRate: new Prisma.Decimal(l.taxRate),
        lineTotalHt,
        lineVat,
        lineTotalTtc,
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
    const resolvedApplyVat = meta.applyVat !== undefined ? meta.applyVat : existing.applyVat;
    const tpsUpd = resolvedApplyVat ? sub.mul(new Prisma.Decimal('0.05')).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP) : new Prisma.Decimal(0);
    const tvqUpd = resolvedApplyVat ? sub.mul(new Prisma.Decimal('0.09975')).toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP) : new Prisma.Decimal(0);
    await prisma.quoteLine.deleteMany({ where: { quoteId: id } });
    const q = await prisma.quote.update({
      where: { id },
      data: {
        ...metaData,
        subtotalHt: sub,
        vatTotal: vat,
        tpsAmount: tpsUpd,
        tvqAmount: tvqUpd,
        totalTtc: ttc,
        lines: { create: lineCreates },
      },
      include: { lines: true, client: true },
    });
    return res.json(q);
  }

  const q = await prisma.quote.update({
    where: { id },
    data: metaData,
    include: { lines: true, client: true },
  });
  return res.json(q);
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.quote.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  if (existing.status !== 'DRAFT') {
    return res.status(400).json({ error: 'Suppression réservée aux brouillons' });
  }
  await prisma.quote.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
