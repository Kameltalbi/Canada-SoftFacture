import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { getOrganizationPlan, planHasRecouvrement } from '../lib/planFeatures.js';
import { sendEmail } from '../services/email.js';

const router = Router();
const orgId = (req: Request) => req.user!.organizationId!;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENT_CHARS = Math.floor(1.2 * 1024 * 1024 * 1.37);

const COLLECTIBLE_STATUSES = ['VALIDATED', 'SENT', 'PARTIALLY_PAID'] as const;

async function requireRecouvrementPlan(req: Request, res: Response): Promise<boolean> {
  const plan = await getOrganizationPlan(orgId(req));
  if (planHasRecouvrement(plan)) return true;
  res.status(403).json({
    error: 'Le recouvrement est réservé au plan Pro.',
    code: 'PLAN_UPGRADE_REQUIRED',
    feature: 'recouvrement',
    requiredPlan: 'PRO',
  });
  return false;
}

function parseCcList(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const addresses = raw
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const invalid = addresses.filter((addr) => !EMAIL_RE.test(addr));
  if (invalid.length) {
    throw new Error(`Adresse(s) en copie invalide(s) : ${invalid.join(', ')}`);
  }
  return addresses.length ? addresses.join(', ') : undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function messageToHtml(message: string): string {
  const htmlBody = escapeHtml(message)
    .split('\n')
    .map((line) => (line.length ? line : '&nbsp;'))
    .join('<br>');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.5;">${htmlBody}</div>`;
}

const createSchema = z.object({
  invoiceId: z.string().min(1),
  clientId: z.string().optional().nullable(),
  channel: z.enum(['email', 'whatsapp', 'phone']),
  outcome: z.string().min(1),
  notes: z.string().max(4000).optional().nullable(),
  promisedPaymentDate: z.coerce.date().optional().nullable(),
  nextReminderDate: z.coerce.date().optional().nullable(),
});

const emailSchema = createSchema.extend({
  to: z.string().email(),
  cc: z.string().max(500).optional().nullable(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(10000),
  attachment: z
    .object({
      filename: z.string().min(1).max(255),
      contentBase64: z.string().min(1),
    })
    .optional()
    .nullable(),
});

router.get('/invoices', async (req, res) => {
  if (!(await requireRecouvrementPlan(req, res))) return;

  const organizationId = orgId(req);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [invoices, reminders, monthPayments] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        organizationId,
        kind: { not: 'CREDIT_NOTE' },
        status: { in: [...COLLECTIBLE_STATUSES, 'PAID'] },
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        payments: { select: { amount: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { issueDate: 'asc' }],
    }),
    prisma.paymentReminder.findMany({
      where: { organizationId },
      select: { invoiceId: true, contactedAt: true },
    }),
    prisma.payment.findMany({
      where: {
        organizationId,
        paymentDate: { gte: monthStart, lt: monthEnd },
        invoice: { kind: { not: 'CREDIT_NOTE' } },
      },
      select: { amount: true, invoiceId: true },
    }),
  ]);

  const reminderCounts: Record<string, number> = {};
  for (const row of reminders) {
    reminderCounts[row.invoiceId] = (reminderCounts[row.invoiceId] || 0) + 1;
  }

  const mapped = invoices.map((inv) => {
    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Math.max(0, Number(inv.totalTtc) - paid);
    return {
      id: inv.id,
      number: inv.number,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      status: inv.status,
      currency: inv.currency,
      totalTtc: Number(inv.totalTtc),
      amountPaid: paid,
      remaining,
      client: inv.client,
      remindersCount: reminderCounts[inv.id] || 0,
    };
  });

  const open = mapped.filter((inv) => inv.remaining > 0.0005);
  const collectedAmount = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const collectedInvoiceIds = new Set(monthPayments.map((p) => p.invoiceId));

  return res.json({
    invoices: open,
    collectedThisMonth: collectedAmount,
    collectedCount: collectedInvoiceIds.size,
  });
});

router.get('/', async (req, res) => {
  if (!(await requireRecouvrementPlan(req, res))) return;
  const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId.trim() : '';
  const list = await prisma.paymentReminder.findMany({
    where: {
      organizationId: orgId(req),
      ...(invoiceId ? { invoiceId } : {}),
    },
    orderBy: { contactedAt: 'desc' },
  });
  return res.json(list);
});

async function createReminder(req: Request, data: z.infer<typeof createSchema>) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: data.invoiceId, organizationId: orgId(req) },
    select: { id: true, clientId: true },
  });
  if (!invoice) return null;
  return prisma.paymentReminder.create({
    data: {
      organizationId: orgId(req),
      invoiceId: invoice.id,
      clientId: data.clientId ?? invoice.clientId,
      channel: data.channel,
      outcome: data.outcome,
      notes: data.notes ?? null,
      promisedPaymentDate: data.promisedPaymentDate ?? null,
      nextReminderDate: data.nextReminderDate ?? null,
      createdById: req.user!.sub,
    },
  });
}

router.post('/', async (req, res) => {
  if (!(await requireRecouvrementPlan(req, res))) return;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }
  const row = await createReminder(req, parsed.data);
  if (!row) return res.status(404).json({ error: 'Facture introuvable' });
  return res.status(201).json(row);
});

router.post('/email', async (req, res) => {
  if (!(await requireRecouvrementPlan(req, res))) return;
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }
  const b = parsed.data;
  if (b.attachment && b.attachment.contentBase64.length > MAX_ATTACHMENT_CHARS) {
    return res.status(400).json({ error: 'Fichier trop volumineux (1,2 Mo maximum).' });
  }

  let cc: string | undefined;
  try {
    cc = parseCcList(b.cc ?? undefined);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Cc invalide' });
  }

  const sent = await sendEmail({
    to: b.to,
    cc,
    subject: b.subject,
    html: messageToHtml(b.message),
    text: b.message,
    attachments: b.attachment
      ? [
          {
            filename: b.attachment.filename,
            content: b.attachment.contentBase64,
            encoding: 'base64',
          },
        ]
      : undefined,
  });
  if (!sent) {
    return res
      .status(503)
      .json({ error: 'Envoi e-mail impossible. Vérifiez la configuration SMTP.' });
  }

  const row = await createReminder(req, {
    invoiceId: b.invoiceId,
    clientId: b.clientId,
    channel: 'email',
    outcome: 'sent',
    notes:
      b.notes ??
      `Email → ${b.to}${cc ? ` · Cc ${cc}` : ''}${b.attachment ? ` (${b.attachment.filename})` : ''}`,
    promisedPaymentDate: null,
    nextReminderDate: null,
  });
  if (!row) return res.status(404).json({ error: 'Facture introuvable' });
  return res.status(201).json(row);
});

export default router;
