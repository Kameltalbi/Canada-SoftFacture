import { Prisma } from '../generated/prisma/index.js';
import type { InvoiceStatus, PaymentMethod } from '../generated/prisma/index.js';

const PAYABLE_STATUSES: readonly InvoiceStatus[] = ['VALIDATED', 'SENT', 'PARTIALLY_PAID'];

export async function recordPaymentInTransaction(
  tx: Prisma.TransactionClient,
  params: {
    organizationId: string;
    invoiceId: string;
    amount: Prisma.Decimal;
    paymentDate: Date;
    method: PaymentMethod;
    reference: string | null;
    notes: string | null;
  }
) {
  const invoice = await tx.invoice.findFirst({
    where: { id: params.invoiceId, organizationId: params.organizationId },
    include: { payments: true },
  });
  if (!invoice) {
    throw new Error('NOT_FOUND');
  }
  if (!PAYABLE_STATUSES.includes(invoice.status)) {
    throw new Error('INVALID_STATUS');
  }

  let paid = new Prisma.Decimal(0);
  for (const p of invoice.payments) {
    paid = paid.add(p.amount);
  }
  const nextPaid = paid.add(params.amount);
  if (nextPaid.gt(invoice.totalTtc)) {
    throw new Error('OVERPAY');
  }

  await tx.payment.create({
    data: {
      organizationId: params.organizationId,
      invoiceId: params.invoiceId,
      amount: params.amount,
      paymentDate: params.paymentDate,
      method: params.method,
      reference: params.reference ?? undefined,
      notes: params.notes ?? undefined,
    },
  });

  const newStatus: InvoiceStatus = nextPaid.gte(invoice.totalTtc) ? 'PAID' : 'PARTIALLY_PAID';

  return tx.invoice.update({
    where: { id: invoice.id },
    data: { status: newStatus },
    include: {
      lines: { orderBy: { sortOrder: 'asc' } },
      client: true,
      organization: true,
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  });
}
