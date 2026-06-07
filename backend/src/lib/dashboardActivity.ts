import { prisma } from './db.js';

const REVENUE_STATUSES = ['VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID'] as const;

const MONTH_LABELS_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

function yearBounds(year: number) {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

function normCountry(c: string | null | undefined): string {
  const s = (c ?? 'FR').trim().toUpperCase();
  if (s.length >= 2) return s.slice(0, 2);
  return 'FR';
}

function n(v: unknown): number {
  return Number(v ?? 0);
}

export type ActivityDashboardPayload = {
  year: number;
  previousYear: number;
  availableYears: number[];
  orgCountry: string;
  kpis: {
    revenueHt: number;
    revenueTtc: number;
    collected: number;
    vatCollected: number;
    growthPct: number | null;
    growthPctTtc: number | null;
  };
  revenueByMonth: {
    month: number;
    label: string;
    current: number;
    previous: number;
    currentTtc: number;
    previousTtc: number;
  }[];
  revenueByCategory: { name: string; amount: number; amountTtc: number }[];
  localExport: { local: number; export: number; localTtc: number; exportTtc: number };
  paidUnpaid: { paidCount: number; unpaidCount: number; paidPct: number; unpaidPct: number };
  invoicesByMonth: { month: number; label: string; count: number }[];
};

export async function buildActivityDashboard(
  organizationId: string,
  year: number
): Promise<ActivityDashboardPayload> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { country: true },
  });
  const orgCountry = normCountry(org?.country);

  const prevYear = year - 1;
  const { start, end } = yearBounds(year);
  const prev = yearBounds(prevYear);

  const invoiceWhere = {
    organizationId,
    status: { in: [...REVENUE_STATUSES] },
    kind: { not: 'DEPOSIT' as const },
    issueDate: { gte: start, lte: end },
  };

  const prevInvoiceWhere = {
    ...invoiceWhere,
    issueDate: { gte: prev.start, lte: prev.end },
  };

  const [yearInvoices, prevInvoices, yearPayments, yearLinesInvoices, allIssueDates] =
    await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          issueDate: true,
          subtotalHt: true,
          totalTtc: true,
          vatTotal: true,
          status: true,
          client: { select: { country: true } },
        },
      }),
      prisma.invoice.findMany({
        where: prevInvoiceWhere,
        select: { issueDate: true, subtotalHt: true, totalTtc: true },
      }),
      prisma.payment.aggregate({
        where: {
          organizationId,
          paymentDate: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          lines: {
            select: {
              lineTotalHt: true,
              lineTotalTtc: true,
              description: true,
              product: { select: { category: { select: { name: true } } } },
            },
          },
        },
      }),
      prisma.invoice.findMany({
        where: {
          organizationId,
          status: { in: [...REVENUE_STATUSES] },
        },
        select: { issueDate: true },
        orderBy: { issueDate: 'asc' },
      }),
    ]);

  const revenueHt = yearInvoices.reduce((s, i) => s + n(i.subtotalHt), 0);
  const revenueTtc = yearInvoices.reduce((s, i) => s + n(i.totalTtc), 0);
  const prevRevenueHt = prevInvoices.reduce((s, i) => s + n(i.subtotalHt), 0);
  const prevRevenueTtc = prevInvoices.reduce((s, i) => s + n(i.totalTtc), 0);
  const vatCollected = yearInvoices.reduce((s, i) => s + n(i.vatTotal), 0);
  const collected = n(yearPayments._sum.amount);

  let growthPct: number | null = null;
  if (prevRevenueHt > 0) {
    growthPct = ((revenueHt - prevRevenueHt) / prevRevenueHt) * 100;
  } else if (revenueHt > 0) {
    growthPct = 100;
  }

  let growthPctTtc: number | null = null;
  if (prevRevenueTtc > 0) {
    growthPctTtc = ((revenueTtc - prevRevenueTtc) / prevRevenueTtc) * 100;
  } else if (revenueTtc > 0) {
    growthPctTtc = 100;
  }

  const monthlyCurrent = Array.from({ length: 12 }, () => 0);
  const monthlyPrevious = Array.from({ length: 12 }, () => 0);
  const monthlyCurrentTtc = Array.from({ length: 12 }, () => 0);
  const monthlyPreviousTtc = Array.from({ length: 12 }, () => 0);
  const invoiceCounts = Array.from({ length: 12 }, () => 0);

  for (const inv of yearInvoices) {
    const m = inv.issueDate.getMonth();
    monthlyCurrent[m] += n(inv.subtotalHt);
    monthlyCurrentTtc[m] += n(inv.totalTtc);
    invoiceCounts[m] += 1;
  }

  for (const inv of prevInvoices) {
    const m = inv.issueDate.getMonth();
    monthlyPrevious[m] += n(inv.subtotalHt);
    monthlyPreviousTtc[m] += n(inv.totalTtc);
  }

  const categoryMap = new Map<string, { ht: number; ttc: number }>();
  for (const inv of yearLinesInvoices) {
    for (const line of inv.lines) {
      const cat = line.product?.category?.name?.trim() || 'Sans catégorie';
      const prev = categoryMap.get(cat) ?? { ht: 0, ttc: 0 };
      categoryMap.set(cat, {
        ht: prev.ht + n(line.lineTotalHt),
        ttc: prev.ttc + n(line.lineTotalTtc),
      });
    }
  }
  const revenueByCategory = [...categoryMap.entries()]
    .map(([name, amounts]) => ({ name, amount: amounts.ht, amountTtc: amounts.ttc }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  let local = 0;
  let exportAmt = 0;
  let localTtc = 0;
  let exportTtc = 0;
  for (const inv of yearInvoices) {
    const ht = n(inv.subtotalHt);
    const ttc = n(inv.totalTtc);
    if (normCountry(inv.client.country) === orgCountry) {
      local += ht;
      localTtc += ttc;
    } else {
      exportAmt += ht;
      exportTtc += ttc;
    }
  }

  let paidCount = 0;
  let unpaidCount = 0;
  for (const inv of yearInvoices) {
    if (inv.status === 'PAID') paidCount += 1;
    else unpaidCount += 1;
  }
  const totalInv = paidCount + unpaidCount;
  const paidPct = totalInv > 0 ? (paidCount / totalInv) * 100 : 0;
  const unpaidPct = totalInv > 0 ? (unpaidCount / totalInv) * 100 : 0;

  const yearSet = new Set<number>([new Date().getFullYear()]);
  for (const row of allIssueDates) {
    yearSet.add(row.issueDate.getFullYear());
  }
  const availableYears = [...yearSet].sort((a, b) => b - a);

  return {
    year,
    previousYear: prevYear,
    availableYears,
    orgCountry,
    kpis: {
      revenueHt,
      revenueTtc,
      collected,
      vatCollected,
      growthPct,
      growthPctTtc,
    },
    revenueByMonth: MONTH_LABELS_FR.map((label, i) => ({
      month: i + 1,
      label,
      current: monthlyCurrent[i],
      previous: monthlyPrevious[i],
      currentTtc: monthlyCurrentTtc[i],
      previousTtc: monthlyPreviousTtc[i],
    })),
    revenueByCategory,
    localExport: { local, export: exportAmt, localTtc, exportTtc },
    paidUnpaid: { paidCount, unpaidCount, paidPct, unpaidPct },
    invoicesByMonth: MONTH_LABELS_FR.map((label, i) => ({
      month: i + 1,
      label,
      count: invoiceCounts[i],
    })),
  };
}
