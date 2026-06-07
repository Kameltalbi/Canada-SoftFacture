'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, Banknote, Receipt, Percent, ChevronDown } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { formatCurrency } from '@/lib/format-money';
import {
  ChartCard,
  DonutChart,
  GroupedBarChart,
  KpiCard,
  LegendAmounts,
  LineTrendChart,
  SimpleBarChart,
} from '@/components/dashboard/activity-charts';
import { RevenueTaxToggle, type RevenueTaxMode } from '@/components/dashboard/revenue-tax-toggle';
import { OnboardingAssistant } from '@/components/onboarding/onboarding-assistant';
import { QuickStartWizard } from '@/components/onboarding/quick-start-wizard';

const TAX_MODE_STORAGE_KEY = 'sf-dashboard-tax-mode';

type ActivityData = {
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
  paidUnpaid: {
    paidCount: number;
    unpaidCount: number;
    paidPct: number;
    unpaidPct: number;
  };
  invoicesByMonth: { month: number; label: string; count: number }[];
};

const CATEGORY_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#64748b',
];

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const { token, user } = useAuth();
  const currency = user?.organization?.defaultCurrency ?? 'CAD';
  const [year, setYear] = useState(new Date().getFullYear());
  const [taxMode, setTaxMode] = useState<RevenueTaxMode>('ht');
  const [data, setData] = useState<ActivityData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TAX_MODE_STORAGE_KEY);
    if (stored === 'ht' || stored === 'ttc') setTaxMode(stored);
  }, []);

  const onTaxModeChange = (mode: RevenueTaxMode) => {
    setTaxMode(mode);
    localStorage.setItem(TAX_MODE_STORAGE_KEY, mode);
  };

  const load = useCallback(
    async (y: number) => {
      setLoading(true);
      try {
        const d = await apiFetch<ActivityData>(`/dashboard/activity?year=${y}`);
        setData(d);
        setErr(null);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : tc('error'));
      } finally {
        setLoading(false);
      }
    },
    [tc]
  );

  useEffect(() => {
    if (!token) return;
    void load(year);
  }, [token, year, load]);

  if (err) {
    return <p className="text-sm text-red-600">{err}</p>;
  }

  if (loading && !data) {
    return <div className="text-sm text-s-muted">{tc('loading')}</div>;
  }

  if (!data) return null;

  const isTtc = taxMode === 'ttc';
  const taxModeLabel = isTtc ? t('taxModeTtc') : t('taxModeHt');
  const chartTaxSuffix = t('chartRevenueTaxSuffix', { mode: taxModeLabel });

  const revenue = isTtc ? data.kpis.revenueTtc : data.kpis.revenueHt;
  const growthPct = isTtc ? data.kpis.growthPctTtc : data.kpis.growthPct;
  const growth = growthPct == null ? '—' : `${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)} %`;

  const monthLabels = data.revenueByMonth.map((m) => m.label);
  const currentSeries = data.revenueByMonth.map((m) => (isTtc ? m.currentTtc : m.current));
  const previousSeries = data.revenueByMonth.map((m) => (isTtc ? m.previousTtc : m.previous));

  const catTotal = data.revenueByCategory.reduce((s, c) => s + (isTtc ? c.amountTtc : c.amount), 0);
  const categorySlices = data.revenueByCategory.map((c, i) => ({
    label: c.name,
    value: isTtc ? c.amountTtc : c.amount,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const local = isTtc ? data.localExport.localTtc : data.localExport.local;
  const exportAmt = isTtc ? data.localExport.exportTtc : data.localExport.export;
  const localExportTotal = local + exportAmt;
  const localPct = localExportTotal > 0 ? (local / localExportTotal) * 100 : 0;
  const exportPct = localExportTotal > 0 ? (exportAmt / localExportTotal) * 100 : 0;

  const years = data.availableYears.length > 0 ? data.availableYears : [new Date().getFullYear()];

  const firstName =
    user?.name?.trim().split(/\s+/)[0] || user?.email?.split('@')[0] || tn('defaultUserName');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-s-navy">{t('greeting', { firstName })}</h1>
          <p className="mt-1 text-sm text-s-muted">{t('activitySubtitle')}</p>
        </div>
        <div className="relative">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="appearance-none rounded-lg border border-s-border bg-white py-2 pe-9 ps-3 text-sm font-medium text-s-navy shadow-sm"
            aria-label={t('yearFilter')}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-2 top-1/2 h-4 w-4 -translate-y-1/2 text-s-muted" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <RevenueTaxToggle mode={taxMode} onChange={onTaxModeChange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={isTtc ? t('kpiRevenueTtc') : t('kpiRevenueHt')}
          value={formatCurrency(revenue, currency)}
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
          accent="blue"
        />
        <KpiCard
          label={t('kpiCollected')}
          value={formatCurrency(data.kpis.collected, currency)}
          icon={<Banknote className="h-5 w-5 text-emerald-500" />}
          accent="green"
        />
        <KpiCard
          label={t('kpiVat')}
          value={formatCurrency(data.kpis.vatCollected, currency)}
          icon={<Receipt className="h-5 w-5 text-violet-500" />}
          accent="violet"
        />
        <KpiCard
          label={t('kpiGrowth')}
          value={growth}
          sub={t('kpiGrowthSub', { year: data.previousYear })}
          icon={<Percent className="h-5 w-5 text-teal-600" />}
          accent="emerald"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={`${t('chartRevenueMonth', { year: data.year, prev: data.previousYear })}${chartTaxSuffix}`}
        >
          <GroupedBarChart
            labels={monthLabels}
            series={[
              {
                name: String(data.year),
                values: currentSeries,
                color: '#3b82f6',
              },
              {
                name: String(data.previousYear),
                values: previousSeries,
                color: '#94a3b8',
              },
            ]}
            height={220}
            currency={currency}
          />
        </ChartCard>

        <ChartCard title={`${t('chartByCategory')}${chartTaxSuffix}`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <DonutChart slices={categorySlices} size={150} />
            <div className="min-w-0 flex-1">
              <LegendAmounts
                items={data.revenueByCategory.map((c, i) => {
                  const amount = isTtc ? c.amountTtc : c.amount;
                  return {
                    label: c.name,
                    value: amount,
                    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                    pct: catTotal > 0 ? (amount / catTotal) * 100 : 0,
                  };
                })}
                currency={currency}
              />
              {data.revenueByCategory.length === 0 ? (
                <p className="text-sm text-s-muted">{tc('empty')}</p>
              ) : null}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title={`${t('chartTrend', { year: data.year, prev: data.previousYear })}${chartTaxSuffix}`}
          className="lg:col-span-2"
        >
          <LineTrendChart
            labels={monthLabels}
            series={[
              { name: String(data.year), values: currentSeries, color: '#3b82f6' },
              { name: String(data.previousYear), values: previousSeries, color: '#94a3b8' },
            ]}
            height={240}
          />
        </ChartCard>

        <ChartCard title={`${t('chartLocalExport')}${chartTaxSuffix}`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <DonutChart
              slices={[
                { label: t('local'), value: local, color: '#3b82f6' },
                { label: t('export'), value: exportAmt, color: '#10b981' },
              ]}
              size={150}
            />
            <LegendAmounts
              items={[
                { label: t('local'), value: local, color: '#3b82f6', pct: localPct },
                { label: t('export'), value: exportAmt, color: '#10b981', pct: exportPct },
              ]}
              currency={currency}
            />
          </div>
          <p className="mt-3 text-xs text-s-muted">
            {t('localExportHint', { country: data.orgCountry })}
          </p>
        </ChartCard>

        <ChartCard title={t('chartPaidUnpaid')}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <DonutChart
              slices={[
                {
                  label: t('paid'),
                  value: data.paidUnpaid.paidCount,
                  color: '#10b981',
                },
                {
                  label: t('unpaid'),
                  value: data.paidUnpaid.unpaidCount,
                  color: '#cbd5e1',
                },
              ]}
              size={150}
              centerLabel={`${data.paidUnpaid.paidPct.toFixed(0)} %`}
            />
            <div className="space-y-3 text-sm">
              <p>
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />{' '}
                {t('paid')}: <strong>{data.paidUnpaid.paidPct.toFixed(1)} %</strong> (
                {data.paidUnpaid.paidCount})
              </p>
              <p>
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />{' '}
                {t('unpaid')}: <strong>{data.paidUnpaid.unpaidPct.toFixed(1)} %</strong> (
                {data.paidUnpaid.unpaidCount})
              </p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title={t('chartInvoiceVolume', { year: data.year })} className="lg:col-span-2">
          <SimpleBarChart
            labels={data.invoicesByMonth.map((m) => m.label)}
            values={data.invoicesByMonth.map((m) => m.count)}
            height={180}
          />
        </ChartCard>
      </div>

      <OnboardingAssistant />
      <QuickStartWizard />
    </div>
  );
}
