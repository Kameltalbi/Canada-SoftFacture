import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/db.js';
import { recordPaymentInTransaction } from '../services/payment.js';

const router = Router();
const orgId = (req: Express.Request) => req.user!.organizationId!;

router.get('/', async (req, res) => {
  const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId.trim() : '';
  const list = await prisma.payment.findMany({
    where: {
      organizationId: orgId(req),
      ...(invoiceId ? { invoiceId } : {}),
    },
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      invoice: { select: { id: true, number: true, status: true, totalTtc: true } },
    },
  });
  return res.json(list);
});

const postSchema = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  paymentDate: z.coerce.date(),
  method: z.enum(['VIREMENT', 'CHEQUE', 'ESPECES', 'CARTE']),
  reference: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

router.post('/', async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }
  const b = parsed.data;
  const inv = await prisma.invoice.findFirst({
    where: { id: b.invoiceId, organizationId: orgId(req) },
  });
  if (!inv) {
    return res.status(404).json({ error: 'Facture introuvable' });
  }

  try {
    const updated = await prisma.$transaction((tx) =>
      recordPaymentInTransaction(tx, {
        organizationId: orgId(req),
        invoiceId: b.invoiceId,
        amount: new Prisma.Decimal(b.amount),
        paymentDate: b.paymentDate,
        method: b.method,
        reference: b.reference ?? null,
        notes: b.notes ?? null,
      })
    );
    return res.status(201).json({ invoice: updated });
  } catch (e: unknown) {
    const code = e instanceof Error ? e.message : '';
    if (code === 'NOT_FOUND') return res.status(404).json({ error: 'Introuvable' });
    if (code === 'INVALID_STATUS') {
      return res.status(400).json({
        error: 'Paiement réservé aux factures validées, envoyées ou partiellement payées',
      });
    }
    if (code === 'OVERPAY') {
      return res.status(400).json({ error: 'Le montant dépasse le reste à payer (TTC)' });
    }
    throw e;
  }
});

export default router;
