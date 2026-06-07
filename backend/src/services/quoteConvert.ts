import type { Prisma } from '../generated/prisma/index.js';

export async function convertQuoteToInvoiceDraft(
  tx: Prisma.TransactionClient,
  params: { quoteId: string; organizationId: string }
) {
  const quote = await tx.quote.findFirst({
    where: { id: params.quoteId, organizationId: params.organizationId },
    include: { lines: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!quote) {
    throw new Error('NOT_FOUND');
  }
  if (quote.status !== 'ACCEPTED') {
    throw new Error('NOT_ACCEPTED');
  }

  const existing = await tx.invoice.findFirst({ where: { quoteId: quote.id } });
  if (existing) {
    throw new Error('ALREADY_CONVERTED');
  }

  const lineCreates = quote.lines.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unitPriceHt: l.unitPriceHt,
    taxRate: l.taxRate,
    lineTotalHt: l.lineTotalHt,
    lineVat: l.lineVat,
    lineTotalTtc: l.lineTotalTtc,
    sortOrder: l.sortOrder,
    productId: l.productId ?? undefined,
  }));

  const inv = await tx.invoice.create({
    data: {
      organizationId: params.organizationId,
      clientId: quote.clientId,
      quoteId: quote.id,
      number: null,
      issueDate: new Date(),
      notes: quote.notes ?? undefined,
      currency: quote.currency,
      applyVat: quote.applyVat,
      applyFiscalStamp: quote.applyFiscalStamp,
      fiscalStamp: quote.fiscalStamp,
      discountEnabled: quote.discountEnabled,
      discountRate: quote.discountRate,
      showCurrencyOnLines: quote.showCurrencyOnLines,
      status: 'DRAFT',
      subtotalHt: quote.subtotalHt,
      vatTotal: quote.vatTotal,
      totalTtc: quote.totalTtc,
      lines: { create: lineCreates },
    },
    include: {
      lines: { orderBy: { sortOrder: 'asc' } },
      client: true,
      organization: true,
      payments: { orderBy: { paymentDate: 'desc' } },
    },
  });

  await tx.quote.update({
    where: { id: quote.id },
    data: { status: 'CONVERTED' },
  });

  return inv;
}
