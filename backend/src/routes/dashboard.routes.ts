import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { buildActivityDashboard } from '../lib/dashboardActivity.js';

const router = Router();

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

router.get('/activity', async (req, res) => {
  const organizationId = req.user!.organizationId!;
  const raw = req.query.year;
  const year =
    typeof raw === 'string' && /^\d{4}$/.test(raw) ? parseInt(raw, 10) : new Date().getFullYear();
  if (year < 2000 || year > 2100) {
    return res.status(400).json({ error: 'Année invalide' });
  }
  const data = await buildActivityDashboard(organizationId, year);
  return res.json(data);
});

router.get('/stats', async (req, res) => {
  const organizationId = req.user!.organizationId!;
  const now = new Date();
  const m0 = monthStart(now);
  const m1 = monthEnd(now);

  const [
    totalInvoiced,
    pendingCount,
    clientCount,
    invoiceCount,
    paidThisMonth,
    monthlyRows,
    recentInvoices,
    quoteCount,
    quotesSentCount,
    recentQuotes,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        organizationId,
        status: { in: ['VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID'] },
      },
      _sum: { totalTtc: true },
    }),
    prisma.invoice.count({
      where: {
        organizationId,
        status: { in: ['VALIDATED', 'SENT', 'PARTIALLY_PAID'] },
      },
    }),
    prisma.client.count({ where: { organizationId } }),
    prisma.invoice.count({ where: { organizationId } }),
    prisma.invoice.aggregate({
      where: {
        organizationId,
        status: 'PAID',
        updatedAt: { gte: m0, lte: m1 },
      },
      _sum: { totalTtc: true },
    }),
    prisma.invoice.findMany({
      where: {
        organizationId,
        status: { in: ['VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID'] },
        issueDate: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
      },
      select: { issueDate: true, totalTtc: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId },
      take: 8,
      orderBy: [{ issueDate: 'desc' }, { number: 'desc' }],
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.quote.count({ where: { organizationId } }),
    prisma.quote.count({ where: { organizationId, status: 'SENT' } }),
    prisma.quote.findMany({
      where: { organizationId },
      take: 8,
      orderBy: [{ issueDate: 'desc' }, { createdAt: 'desc' }],
      include: { client: { select: { id: true, name: true } } },
    }),
  ]);

  const chart: { label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    chart.push({
      label: d.toLocaleDateString('fr-FR', { month: 'short' }),
      total: 0,
    });
  }
  for (const row of monthlyRows) {
    for (let j = 0; j < 6; j++) {
      const ref = new Date(now.getFullYear(), now.getMonth() - (5 - j), 1);
      if (
        row.issueDate.getFullYear() === ref.getFullYear() &&
        row.issueDate.getMonth() === ref.getMonth()
      ) {
        chart[j].total += Number(row.totalTtc);
        break;
      }
    }
  }

  const invActivity = recentInvoices.map((inv) => ({
    kind: 'invoice' as const,
    id: inv.id,
    number: inv.number ?? 'Brouillon',
    clientName: inv.client.name,
    at: inv.updatedAt.toISOString(),
  }));
  const quoteActivity = recentQuotes.map((q) => ({
    kind: 'quote' as const,
    id: q.id,
    number: q.number ?? 'Brouillon',
    clientName: q.client.name,
    at: q.updatedAt.toISOString(),
  }));
  const recentActivity = [...invActivity, ...quoteActivity]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return res.json({
    totalInvoiced: Number(totalInvoiced._sum.totalTtc ?? 0),
    pendingCount,
    clientCount,
    invoiceCount,
    paidThisMonth: Number(paidThisMonth._sum.totalTtc ?? 0),
    quoteCount,
    quotesSentCount,
    chart,
    recentInvoices,
    recentQuotes,
    recentActivity,
  });
});

export default router;
