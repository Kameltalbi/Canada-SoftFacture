import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/db.js';
import { initialNextRunDate } from '../lib/recurringSchedule.js';
import {
  generateRecurringInvoiceInTransaction,
  runDueRecurringInvoices,
} from '../services/recurringInvoiceGenerate.js';
import { documentLanguageSchema, toPrismaDocumentLanguage } from '../lib/documentLanguage.js';

const router = Router();
const orgId = (req: Express.Request) => req.user!.organizationId!;

const lineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceHt: z.number().nonnegative(),
  taxRate: z.number().min(0).max(100),
  productId: z.string().optional().nullable(),
});

const createSchema = z.object({
  clientId: z.string(),
  title: z.string().optional().nullable(),
  frequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  dayOfMonth: z.number().int().min(1).max(28).optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  autoValidate: z.boolean().optional(),
  dueDaysAfter: z.number().int().min(0).max(365).optional(),
  currency: z.string().length(3).optional(),
  applyVat: z.boolean().optional(),
  applyFiscalStamp: z.boolean().optional(),
  fiscalStamp: z.number().nonnegative().optional(),
  discountEnabled: z.boolean().optional(),
  discountRate: z.number().min(0).max(100).optional(),
  showCurrencyOnLines: z.boolean().optional(),
  documentLanguage: z.enum(documentLanguageSchema).optional(),
  notes: z.string().optional().nullable(),
  lines: z.array(lineSchema).min(1),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
});

router.get('/', async (req, res) => {
  const list = await prisma.recurringInvoice.findMany({
    where: { organizationId: orgId(req) },
    include: {
      client: { select: { id: true, name: true, email: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { generatedInvoices: true } },
    },
    orderBy: [{ nextRunDate: 'asc' }],
  });
  return res.json(list);
});

router.post('/run-due', async (req, res) => {
  const results = await prisma.$transaction((tx) => runDueRecurringInvoices(tx, orgId(req)));
  return res.json({ generated: results.filter((r) => r.invoiceId).length, results });
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

  const dayOfMonth =
    input.frequency === 'WEEKLY' ? null : (input.dayOfMonth ?? new Date(input.startDate).getDate());
  const nextRunDate = initialNextRunDate(input.startDate, input.frequency, dayOfMonth);

  const created = await prisma.recurringInvoice.create({
    data: {
      organizationId: orgId(req),
      clientId: input.clientId,
      title: input.title ?? undefined,
      frequency: input.frequency,
      dayOfMonth,
      startDate: input.startDate,
      endDate: input.endDate ?? undefined,
      nextRunDate,
      autoValidate: input.autoValidate ?? true,
      dueDaysAfter: input.dueDaysAfter ?? 30,
      currency: input.currency ?? 'CAD',
      applyVat: input.applyVat ?? true,
      applyFiscalStamp: input.applyFiscalStamp ?? false,
      fiscalStamp: new Prisma.Decimal(input.fiscalStamp ?? 1),
      discountEnabled: input.discountEnabled ?? false,
      discountRate: new Prisma.Decimal(input.discountRate ?? 0),
      showCurrencyOnLines: input.showCurrencyOnLines ?? true,
      documentLanguage: toPrismaDocumentLanguage(input.documentLanguage ?? 'fr'),
      notes: input.notes ?? undefined,
      lines: {
        create: input.lines.map((l, idx) => ({
          description: l.description,
          quantity: new Prisma.Decimal(l.quantity),
          unitPriceHt: new Prisma.Decimal(l.unitPriceHt),
          taxRate: new Prisma.Decimal(l.taxRate),
          sortOrder: idx,
          productId: l.productId ?? undefined,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
    },
  });
  return res.status(201).json(created);
});

router.get('/:id', async (req, res) => {
  const row = await prisma.recurringInvoice.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
    include: {
      client: true,
      lines: { orderBy: { sortOrder: 'asc' } },
      generatedInvoices: {
        orderBy: { issueDate: 'desc' },
        take: 20,
        select: {
          id: true,
          number: true,
          issueDate: true,
          status: true,
          totalTtc: true,
          currency: true,
        },
      },
    },
  });
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  return res.json(row);
});

router.patch('/:id', async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const id = req.params.id;
  const existing = await prisma.recurringInvoice.findFirst({
    where: { id, organizationId: orgId(req) },
    include: { lines: true },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });

  const { lines, ...meta } = parsed.data;
  const data: Prisma.RecurringInvoiceUpdateInput = {};

  if (meta.clientId !== undefined) data.client = { connect: { id: meta.clientId } };
  if (meta.title !== undefined) data.title = meta.title;
  if (meta.frequency !== undefined) data.frequency = meta.frequency;
  if (meta.dayOfMonth !== undefined) data.dayOfMonth = meta.dayOfMonth;
  if (meta.startDate !== undefined) data.startDate = meta.startDate;
  if (meta.endDate !== undefined) data.endDate = meta.endDate;
  if (meta.status !== undefined) data.status = meta.status;
  if (meta.autoValidate !== undefined) data.autoValidate = meta.autoValidate;
  if (meta.dueDaysAfter !== undefined) data.dueDaysAfter = meta.dueDaysAfter;
  if (meta.currency !== undefined) data.currency = meta.currency;
  if (meta.applyVat !== undefined) data.applyVat = meta.applyVat;
  if (meta.applyFiscalStamp !== undefined) data.applyFiscalStamp = meta.applyFiscalStamp;
  if (meta.fiscalStamp !== undefined) data.fiscalStamp = new Prisma.Decimal(meta.fiscalStamp);
  if (meta.discountEnabled !== undefined) data.discountEnabled = meta.discountEnabled;
  if (meta.discountRate !== undefined) data.discountRate = new Prisma.Decimal(meta.discountRate);
  if (meta.showCurrencyOnLines !== undefined) data.showCurrencyOnLines = meta.showCurrencyOnLines;
  if (meta.documentLanguage !== undefined)
    data.documentLanguage = toPrismaDocumentLanguage(meta.documentLanguage);
  if (meta.notes !== undefined) data.notes = meta.notes;

  if (lines) {
    await prisma.recurringInvoiceLine.deleteMany({ where: { recurringInvoiceId: id } });
    data.lines = {
      create: lines.map((l, idx) => ({
        description: l.description,
        quantity: new Prisma.Decimal(l.quantity),
        unitPriceHt: new Prisma.Decimal(l.unitPriceHt),
        taxRate: new Prisma.Decimal(l.taxRate),
        sortOrder: idx,
        productId: l.productId ?? undefined,
      })),
    };
  }

  const updated = await prisma.recurringInvoice.update({
    where: { id },
    data,
    include: {
      client: { select: { id: true, name: true, email: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
    },
  });
  return res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.recurringInvoice.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  await prisma.recurringInvoice.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

router.post('/:id/generate', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await prisma.$transaction((tx) =>
      generateRecurringInvoiceInTransaction(tx, {
        recurringId: id,
        organizationId: orgId(req),
      })
    );
    return res.status(201).json(result);
  } catch (e: unknown) {
    const code = e instanceof Error ? e.message : '';
    if (code === 'NOT_FOUND') return res.status(404).json({ error: 'Introuvable' });
    if (code === 'NOT_ACTIVE') return res.status(400).json({ error: 'Modèle inactif ou en pause' });
    if (code === 'NOT_DUE')
      return res.status(400).json({ error: 'Prochaine échéance pas encore atteinte' });
    if (code === 'ENDED') return res.status(400).json({ error: 'Période de récurrence terminée' });
    if (code === 'NO_LINES') return res.status(400).json({ error: 'Aucune ligne sur le modèle' });
    throw e;
  }
});

export default router;
