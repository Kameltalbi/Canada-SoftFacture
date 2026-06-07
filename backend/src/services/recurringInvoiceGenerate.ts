import {
  Prisma,
  type RecurringInvoice,
  type RecurringInvoiceLine,
} from '../generated/prisma/index.js';
import { calcLine } from '../lib/money.js';
import { computeNextRunDate, isDue, startOfDay } from '../lib/recurringSchedule.js';
import { computeNetToPay } from '../lib/invoiceTotals.js';
import { validateInvoiceInTransaction } from './invoiceValidate.js';

export { isDue };

type RecurringWithLines = RecurringInvoice & { lines: RecurringInvoiceLine[] };

function buildLineCreates(
  template: RecurringWithLines,
  applyVat: boolean,
  discountFactor: Prisma.Decimal
) {
  return template.lines.map((l, idx) => {
    const effectiveTaxRate = applyVat ? Number(l.taxRate) : 0;
    const { lineTotalHt, lineVat, lineTotalTtc } = calcLine(
      Number(l.quantity),
      Number(l.unitPriceHt),
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
      quantity: l.quantity,
      unitPriceHt: l.unitPriceHt,
      taxRate: new Prisma.Decimal(effectiveTaxRate),
      lineTotalHt: discountedHt,
      lineVat: discountedVat,
      lineTotalTtc: discountedTtc,
      sortOrder: idx,
      productId: l.productId ?? undefined,
    };
  });
}

export async function generateRecurringInvoiceInTransaction(
  tx: Prisma.TransactionClient,
  params: { recurringId: string; organizationId: string; runDate?: Date }
) {
  const template = await tx.recurringInvoice.findFirst({
    where: { id: params.recurringId, organizationId: params.organizationId },
    include: { lines: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!template) throw new Error('NOT_FOUND');
  if (template.status !== 'ACTIVE') throw new Error('NOT_ACTIVE');
  if (!template.lines.length) throw new Error('NO_LINES');

  const runDate = startOfDay(params.runDate ?? new Date());
  if (!isDue(template.nextRunDate, runDate)) throw new Error('NOT_DUE');

  if (template.endDate && startOfDay(template.endDate) < runDate) {
    await tx.recurringInvoice.update({
      where: { id: template.id },
      data: { status: 'COMPLETED' },
    });
    throw new Error('ENDED');
  }

  const applyVat = template.applyVat;
  const applyFiscalStamp = template.applyFiscalStamp;
  const fiscalStamp = template.fiscalStamp;
  const discountEnabled = template.discountEnabled;
  const discountRate = template.discountRate;
  const discountFactor = new Prisma.Decimal(1).minus(discountEnabled ? discountRate.div(100) : 0);

  const lineCreates = buildLineCreates(template, applyVat, discountFactor);
  let sub = new Prisma.Decimal(0);
  let vat = new Prisma.Decimal(0);
  let ttc = new Prisma.Decimal(0);
  for (const l of lineCreates) {
    sub = sub.add(l.lineTotalHt);
    vat = vat.add(l.lineVat);
    ttc = ttc.add(l.lineTotalTtc);
  }
  if (applyFiscalStamp) ttc = ttc.add(fiscalStamp);
  const netToPay = computeNetToPay(ttc, 0);

  const issueDate = runDate;
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + template.dueDaysAfter);

  const inv = await tx.invoice.create({
    data: {
      organizationId: template.organizationId,
      clientId: template.clientId,
      recurringInvoiceId: template.id,
      number: null,
      kind: 'STANDARD',
      advanceDeduction: 0,
      netToPay,
      issueDate,
      dueDate,
      notes: template.notes,
      currency: template.currency,
      applyVat,
      applyFiscalStamp,
      fiscalStamp,
      discountEnabled,
      discountRate,
      showCurrencyOnLines: template.showCurrencyOnLines,
      documentLanguage: template.documentLanguage,
      status: 'DRAFT',
      subtotalHt: sub,
      vatTotal: vat,
      totalTtc: ttc,
      lines: { create: lineCreates },
    },
    include: { lines: true, client: true },
  });

  let result = inv;
  if (template.autoValidate) {
    result = await validateInvoiceInTransaction(tx, {
      invoiceId: inv.id,
      organizationId: params.organizationId,
    });
  }

  const nextRun = computeNextRunDate(
    runDate,
    template.frequency,
    template.dayOfMonth ?? runDate.getDate()
  );
  const completed = template.endDate && startOfDay(template.endDate).getTime() < nextRun.getTime();

  await tx.recurringInvoice.update({
    where: { id: template.id },
    data: {
      nextRunDate: nextRun,
      lastGeneratedAt: new Date(),
      status: completed ? 'COMPLETED' : 'ACTIVE',
    },
  });

  return {
    invoice: result,
    recurring: await tx.recurringInvoice.findUnique({ where: { id: template.id } }),
  };
}

export async function runDueRecurringInvoices(
  tx: Prisma.TransactionClient,
  organizationId: string,
  asOf = new Date()
) {
  const due = await tx.recurringInvoice.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      nextRunDate: { lte: startOfDay(asOf) },
    },
    select: { id: true },
  });

  const results: { recurringId: string; invoiceId?: string; error?: string }[] = [];
  for (const row of due) {
    try {
      const { invoice } = await generateRecurringInvoiceInTransaction(tx, {
        recurringId: row.id,
        organizationId,
        runDate: asOf,
      });
      results.push({ recurringId: row.id, invoiceId: invoice.id });
    } catch (e: unknown) {
      const code = e instanceof Error ? e.message : 'ERROR';
      if (code === 'ENDED') {
        results.push({ recurringId: row.id, error: 'ENDED' });
      } else {
        results.push({ recurringId: row.id, error: code });
      }
    }
  }
  return results;
}
