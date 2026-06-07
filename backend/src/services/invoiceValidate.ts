import crypto from 'crypto';
import type { Prisma } from '../generated/prisma/index.js';
import { allocateNextDocumentNumber } from '../lib/documentNumbering.js';
import { applyStockOnInvoiceValidation } from './stockLedger.js';

/** Génère le hash SHA-256 d'une facture validée pour la chaîne d'audit. */
function computeInvoiceHash(params: {
  invoiceNumber: string;
  issueDate: Date;
  totalTtc: string;
  clientId: string;
  validatedAt: Date;
  previousHash: string | null;
}): string {
  const payload = [
    params.invoiceNumber,
    params.issueDate.toISOString(),
    params.totalTtc,
    params.clientId,
    params.validatedAt.toISOString(),
    params.previousHash ?? 'GENESIS',
  ].join('|');
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

const CANCELLABLE = ['VALIDATED', 'SENT', 'PARTIALLY_PAID'] as const;

export async function validateInvoiceInTransaction(
  tx: Prisma.TransactionClient,
  params: { invoiceId: string; organizationId: string }
) {
  const inv = await tx.invoice.findFirst({
    where: { id: params.invoiceId, organizationId: params.organizationId },
    include: {
      lines: { orderBy: { sortOrder: 'asc' } },
      client: true,
      organization: true,
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  });
  if (!inv) {
    throw new Error('NOT_FOUND');
  }
  if (inv.status === 'VALIDATED' && inv.number) {
    return inv;
  }
  if (inv.status !== 'DRAFT') {
    throw new Error('NOT_DRAFT');
  }
  if (inv.number) {
    throw new Error('HAS_NUMBER');
  }

  const { number, year, sequence } = await allocateNextDocumentNumber(tx, {
    organizationId: params.organizationId,
    type: inv.kind === 'DEPOSIT' ? 'deposit' : inv.kind === 'CREDIT_NOTE' ? 'credit' : 'invoice',
    issueDate: inv.issueDate,
  });

  const updated = await tx.invoice.update({
    where: { id: inv.id },
    data: {
      number,
      invoiceYear: year,
      sequenceNumber: sequence,
      status: 'VALIDATED',
    },
    include: {
      lines: { orderBy: { sortOrder: 'asc' } },
      client: true,
      organization: true,
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  });

  await applyStockOnInvoiceValidation(tx, {
    invoiceId: updated.id,
    organizationId: params.organizationId,
  });

  const validatedAt = new Date();

  const lastLog = await tx.invoiceAuditLog.findFirst({
    where: { organizationId: params.organizationId },
    orderBy: { validatedAt: 'desc' },
    select: { hash: true },
  });

  const hash = computeInvoiceHash({
    invoiceNumber: number,
    issueDate: inv.issueDate,
    totalTtc: inv.totalTtc.toString(),
    clientId: inv.clientId,
    validatedAt,
    previousHash: lastLog?.hash ?? null,
  });

  await tx.invoiceAuditLog.create({
    data: {
      invoiceId: updated.id,
      organizationId: params.organizationId,
      invoiceNumber: number,
      hash,
      previousHash: lastLog?.hash ?? null,
      validatedAt,
      totalTtc: inv.totalTtc.toString(),
      clientId: inv.clientId,
    },
  });

  return updated;
}

export function canCancelInvoice(status: string) {
  return (CANCELLABLE as readonly string[]).includes(status);
}
