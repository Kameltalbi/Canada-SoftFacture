'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import {
  Plus,
  RefreshCw,
  Search,
  Download,
  Upload,
  MoreHorizontal,
  User,
  Mail,
  FileText,
  Play,
  Pause,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatEuro } from '@/lib/format-money';
import { cn } from '@/lib/utils';
import {
  FilterDropdown,
  FilterOption,
  ListPagination,
  StatTabButton,
  paginateRows,
} from '@/components/list/list-ui';

type RecurringStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';
type RecurringFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
type StatusTab = 'all' | RecurringStatus;

type RecurringLine = {
  quantity: unknown;
  unitPriceHt: unknown;
  taxRate: unknown;
};

type RecurringRow = {
  id: string;
  title: string | null;
  frequency: RecurringFrequency;
  nextRunDate: string;
  status: RecurringStatus;
  client: { id: string; name: string; email: string | null };
  lines: RecurringLine[];
  _count: { generatedInvoices: number };
};

const STATUS_TABS: StatusTab[] = ['all', 'ACTIVE', 'PAUSED', 'COMPLETED'];

const statusClass: Record<RecurringStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-600 border-slate-200',
};

function lineTtc(line: RecurringLine): number {
  const ht = Number(line.quantity) * Number(line.unitPriceHt);
  return ht * (1 + Number(line.taxRate) / 100);
}

function recurringAmount(row: RecurringRow): number {
  return row.lines.reduce((sum, line) => sum + lineTtc(line), 0);
}

function ActionsMenuWrapper({
  row,
  t,
  tc,
  onAction,
}: {
  row: RecurringRow;
  t: (key: string) => string;
  tc: (key: string) => string;
  onAction: (action: string, row: RecurringRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const items = [
    { key: 'view', icon: FileText, label: t('view') },
    ...(row.status === 'ACTIVE' ? [{ key: 'generate', icon: Play, label: t('generateNow') }] : []),
    ...(row.status === 'ACTIVE' || row.status === 'PAUSED'
      ? [
          {
            key: 'pause',
            icon: Pause,
            label: row.status === 'PAUSED' ? t('resume') : t('pause'),
            separator: true,
          },
        ]
      : []),
    { key: 'delete', icon: Trash2, label: tc('delete'), danger: true, separator: true },
  ];

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-lg p-2 text-s-muted hover:bg-slate-100 hover:text-s-navy"
        aria-label={t('actions')}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute end-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-s-border bg-white py-1 shadow-lg">
          {items.map((a) => (
            <div key={a.key}>
              {'separator' in a && a.separator ? (
                <div className="my-1 border-t border-s-border" />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onAction(a.key, row);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
                  'danger' in a && a.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-s-navy hover:bg-slate-50'
                )}
              >
                <a.icon className="h-4 w-4 shrink-0 text-s-muted" />
                {a.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function RecurringInvoicesPage() {
  const t = useTranslations('recurring');
  const tc = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const { token } = useAuth();
  const [list, setList] = useState<RecurringRow[] | null>(null);
  const [pending, setPending] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [query, setQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | RecurringFrequency>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    const data = await apiFetch<RecurringRow[]>('/recurring-invoices');
    setList(data);
  }, []);

  useEffect(() => {
    if (!token) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
  }, [token, load, toast]);

  useEffect(() => {
    setPage(1);
  }, [query, clientFilter, frequencyFilter, activeTab, pageSize]);

  const clients = useMemo(() => {
    if (!list) return [];
    const map = new Map<string, string>();
    for (const row of list) map.set(row.client.id, row.client.name);
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [list]);

  const baseFiltered = useMemo(() => {
    if (!list) return [];
    const q = query.trim().toLowerCase();
    return list.filter((row) => {
      if (clientFilter !== 'all' && row.client.id !== clientFilter) return false;
      if (frequencyFilter !== 'all' && row.frequency !== frequencyFilter) return false;
      if (!q) return true;
      return (
        row.title?.toLowerCase().includes(q) ||
        row.client.name.toLowerCase().includes(q) ||
        row.client.email?.toLowerCase().includes(q)
      );
    });
  }, [list, query, clientFilter, frequencyFilter]);

  const tabStats = useMemo(() => {
    const stats: Record<StatusTab, { count: number; amount: number }> = {
      all: { count: 0, amount: 0 },
      ACTIVE: { count: 0, amount: 0 },
      PAUSED: { count: 0, amount: 0 },
      COMPLETED: { count: 0, amount: 0 },
    };
    for (const row of baseFiltered) {
      const amount = recurringAmount(row);
      stats.all.count += 1;
      stats.all.amount += amount;
      stats[row.status].count += 1;
      stats[row.status].amount += amount;
    }
    return stats;
  }, [baseFiltered]);

  const filtered = useMemo(() => {
    if (activeTab === 'all') return baseFiltered;
    return baseFiltered.filter((row) => row.status === activeTab);
  }, [baseFiltered, activeTab]);

  const { rows: paginated, safePage } = paginateRows(filtered, page, pageSize);
  const rowStart = filtered.length ? (safePage - 1) * pageSize + 1 : 0;
  const rowEnd = Math.min(safePage * pageSize, filtered.length);

  async function runDue() {
    setPending(true);
    try {
      const res = await apiFetch<{ generated: number }>('/recurring-invoices/run-due', {
        method: 'POST',
      });
      await load();
      toast.push(t('runDueSuccess', { count: res.generated }));
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setPending(false);
    }
  }

  function exportCsv() {
    if (!filtered.length) {
      toast.push(tc('empty'), 'error');
      return;
    }
    const header = [
      t('columnLabel'),
      t('columnAmountTtc'),
      t('client'),
      t('frequency'),
      t('nextRun'),
      t('status'),
      t('generatedCount'),
    ];
    const rows = filtered.map((row) => [
      row.title ?? t('untitled'),
      recurringAmount(row).toFixed(2),
      row.client.name,
      t(`freq_${row.frequency}`),
      format(new Date(row.nextRunDate), 'dd/MM/yyyy'),
      t(`status_${row.status}`),
      String(row._count.generatedInvoices),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures-recurrentes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleAction(action: string, row: RecurringRow) {
    switch (action) {
      case 'view':
        router.push(`/recurring-invoices/${row.id}`);
        break;
      case 'sendEmail': {
        const email = row.client.email?.trim();
        if (!email) {
          toast.push(t('toastNoClientEmail'), 'error');
          return;
        }
        const label = row.title ?? t('untitled');
        const subject = encodeURIComponent(`Facturation récurrente — ${label}`);
        const body = encodeURIComponent(
          `Bonjour,\n\nConcernant votre abonnement : ${label}.\n\nCordialement`
        );
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        break;
      }
      case 'generate':
        void apiFetch<{ invoice: { id: string } }>(`/recurring-invoices/${row.id}/generate`, {
          method: 'POST',
        })
          .then((res) => {
            toast.push(t('generated') + ' ✓');
            void load();
            router.push(`/invoices/${res.invoice.id}`);
          })
          .catch((e: unknown) => toast.push(e instanceof Error ? e.message : 'Erreur', 'error'));
        break;
      case 'pause': {
        const next = row.status === 'PAUSED' ? 'ACTIVE' : 'PAUSED';
        void apiFetch(`/recurring-invoices/${row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: next }),
        })
          .then(() => {
            toast.push(next === 'PAUSED' ? t('pause') + ' ✓' : t('resume') + ' ✓');
            void load();
          })
          .catch((e: unknown) => toast.push(e instanceof Error ? e.message : 'Erreur', 'error'));
        break;
      }
      case 'delete':
        if (!window.confirm(t('deleteConfirm'))) return;
        void apiFetch(`/recurring-invoices/${row.id}`, { method: 'DELETE' })
          .then(() => {
            toast.push(tc('delete') + ' ✓');
            void load();
          })
          .catch((e: unknown) => toast.push(e instanceof Error ? e.message : 'Erreur', 'error'));
        break;
    }
  }

  function tabLabel(tab: StatusTab): string {
    if (tab === 'all') return t('tabAll');
    return t(`status_${tab}`);
  }

  if (!list) {
    return <p className="text-sm text-s-muted">{tc('loading')}</p>;
  }

  return (
    <div className="space-y-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-s-navy">{t('title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/recurring-invoices/new">
            <Button type="button" className="bg-[#1e3a8a] text-white hover:bg-[#1e40af]">
              <Plus className="h-4 w-4" />
              {t('new')}
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            className="border border-s-border bg-white"
            disabled={pending}
            onClick={() => void runDue()}
          >
            <RefreshCw className={cn('h-4 w-4', pending && 'animate-spin')} />
            {t('runDue')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="border border-s-border bg-white"
            onClick={exportCsv}
          >
            <Download className="h-4 w-4" />
            {t('export')}
          </Button>
          <button
            type="button"
            className="rounded-lg border border-s-border bg-white p-2.5 text-s-muted hover:bg-slate-50"
            title={t('importSoon')}
            onClick={() => toast.push(t('importSoon'))}
          >
            <Upload className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-4 overflow-x-auto border-b border-s-border">
        <div className="flex min-w-max">
          {STATUS_TABS.map((tab) => (
            <StatTabButton
              key={tab}
              active={activeTab === tab}
              label={tabLabel(tab)}
              count={tabStats[tab].count}
              amount={tabStats[tab].amount}
              onClick={() => setActiveTab(tab)}
            />
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-s-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full rounded-lg border border-s-border bg-white py-2 pe-3 ps-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
          />
        </div>
        <FilterDropdown
          label={t('filterClient')}
          valueLabel={
            clientFilter !== 'all' ? clients.find((c) => c.id === clientFilter)?.name : undefined
          }
        >
          <FilterOption active={clientFilter === 'all'} onClick={() => setClientFilter('all')}>
            {t('filterAll')}
          </FilterOption>
          {clients.map((c) => (
            <FilterOption
              key={c.id}
              active={clientFilter === c.id}
              onClick={() => setClientFilter(c.id)}
            >
              {c.name}
            </FilterOption>
          ))}
        </FilterDropdown>
        <FilterDropdown
          label={t('frequency')}
          valueLabel={frequencyFilter !== 'all' ? t(`freq_${frequencyFilter}`) : undefined}
        >
          <FilterOption
            active={frequencyFilter === 'all'}
            onClick={() => setFrequencyFilter('all')}
          >
            {t('filterAll')}
          </FilterOption>
          {(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as RecurringFrequency[]).map((f) => (
            <FilterOption
              key={f}
              active={frequencyFilter === f}
              onClick={() => setFrequencyFilter(f)}
            >
              {t(`freq_${f}`)}
            </FilterOption>
          ))}
        </FilterDropdown>
      </div>

      <section className="overflow-hidden rounded-xl border border-s-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-s-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-s-muted">
                <th className="px-5 py-3">{t('columnLabel')}</th>
                <th className="px-5 py-3">{t('columnAmountTtc')}</th>
                <th className="px-5 py-3">{t('client')}</th>
                <th className="px-5 py-3">{t('frequency')}</th>
                <th className="px-5 py-3">{t('nextRun')}</th>
                <th className="px-5 py-3">{t('status')}</th>
                <th className="px-5 py-3">{t('generatedCount')}</th>
                <th className="px-5 py-3 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row) => (
                <tr key={row.id} className="border-b border-s-border/50 hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <Link
                      href={`/recurring-invoices/${row.id}`}
                      className="font-semibold text-[#1e3a8a] hover:underline"
                    >
                      {row.title ?? t('untitled')}
                    </Link>
                  </td>
                  <td className="px-5 py-4 font-semibold text-s-navy">
                    {formatEuro(recurringAmount(row))}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-s-muted">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium text-[#1e3a8a]">{row.client.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-s-navy">{t(`freq_${row.frequency}`)}</td>
                  <td className="px-5 py-4 text-s-navy">
                    {format(new Date(row.nextRunDate), 'd MMM yyyy', { locale: frLocale })}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                        statusClass[row.status]
                      )}
                    >
                      {t(`status_${row.status}`)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-s-navy">{row._count.generatedInvoices}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-s-muted hover:bg-slate-100 hover:text-s-navy"
                        title={t('actionSendEmail')}
                        onClick={() => handleAction('sendEmail', row)}
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-s-muted hover:bg-slate-100 hover:text-s-navy"
                        title={t('view')}
                        onClick={() => handleAction('view', row)}
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <ActionsMenuWrapper row={row} t={t} tc={tc} onAction={handleAction} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? (
            <p className="py-16 text-center text-sm text-s-muted">{t('empty')}</p>
          ) : null}
        </div>
        {filtered.length > 0 ? (
          <ListPagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            rowsText={t('paginationRows', { start: rowStart, end: rowEnd, total: filtered.length })}
            prevLabel={t('paginationPrev')}
            nextLabel={t('paginationNext')}
          />
        ) : null}
      </section>
    </div>
  );
}
