import type { Prisma } from '../generated/prisma/index.js';
import { allocateNextDocumentNumber } from '../lib/documentNumbering.js';

export async function validateQuoteInTransaction(
  tx: Prisma.TransactionClient,
  params: { quoteId: string; organizationId: string }
) {
  const q = await tx.quote.findFirst({
    where: { id: params.quoteId, organizationId: params.organizationId },
    include: {
      lines: { orderBy: { sortOrder: 'asc' } },
      client: true,
      organization: true,
    },
  });
  if (!q) {
    throw new Error('NOT_FOUND');
  }
  if (q.status === 'SENT' && q.number) {
    return q;
  }
  if (q.status !== 'DRAFT') {
    throw new Error('NOT_DRAFT');
  }
  if (q.number) {
    throw new Error('HAS_NUMBER');
  }

  const { number, year, sequence } = await allocateNextDocumentNumber(tx, {
    organizationId: params.organizationId,
    type: 'quote',
    issueDate: q.issueDate,
  });

  return tx.quote.update({
    where: { id: q.id },
    data: {
      number,
      quoteYear: year,
      sequenceNumber: sequence,
      status: 'SENT',
    },
    include: {
      lines: { orderBy: { sortOrder: 'asc' } },
      client: true,
      organization: true,
    },
  });
}
