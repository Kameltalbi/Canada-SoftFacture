'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { Inbox, Search, Upload, AlertTriangle } from 'lucide-react';
import {
  apiFetch,
  importReceivedFacturXPdfFromApi,
  type ReceivedInvoiceListRow,
  type ReceivedInvoiceStatus,
} from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatEuro } from '@/lib/format-money';
import { cn } from '@/lib/utils';
import { ListPagination, StatTabButton, paginateRows } from '@/components/list/list-ui';
import { EinvoiceFeatureGate } from '@/components/einvoice/einvoice-feature-gate';

type StatusTab = 'all' | ReceivedInvoiceStatus;

const STATUS_TABS: StatusTab[] = [
  'all',
  'RECEIVED',
  'ACCEPTED',
  'DISPUTED',
  'REFUSED',
  'COLLECTED',
];

const statusClass: Record<ReceivedInvoiceStatus, string> = {
  RECEIVED: 'bg-sky-50 text-sky-700 border-sky-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISPUTED: 'bg-amber-50 text-amber-700 border-amber-200',
  REFUSED: 'bg-red-50 text-red-700 border-red-200',
  COLLECTED: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function ReceivedInvoicesPage() {
  return (
    <EinvoiceFeatureGate>
      <ReceivedInvoicesPageContent />
    </EinvoiceFeatureGate>
  );
}

function ReceivedInvoicesPageContent() {
  const t = useTranslations('receivedInvoices');
  const tc = useTranslations('common');
  const { token } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<ReceivedInvoiceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importPending, setImportPending] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<StatusTab>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const load = useCallback(async () => {
    const data = await apiFetch<ReceivedInvoiceListRow[]>('/received-invoices');
    setRows(data);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void load()
      .catch((e: unknown) => toast.push(e instanceof Error ? e.message : 'Erreur', 'error'))
      .finally(() => setLoading(false));
  }, [token, load, toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== 'all' && r.status !== tab) return false;
      if (!q) return true;
      return (
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        (r.supplierSiren ?? '').includes(q)
      );
    });
  }, [rows, search, tab]);

  const tabCounts = useMemo(() => {
    const counts: Record<StatusTab, number> = {
      all: rows.length,
      RECEIVED: 0,
      ACCEPTED: 0,
      DISPUTED: 0,
      REFUSED: 0,
      COLLECTED: 0,
    };
    for (const r of rows) counts[r.status]++;
    return counts;
  }, [rows]);

  const { rows: pageRows, safePage } = useMemo(
    () => paginateRows(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  const rowStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rowEnd = Math.min(safePage * pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [search, tab, pageSize]);

  async function onImport(file: File) {
    setImportPending(true);
    try {
      const result = await importReceivedFacturXPdfFromApi(file);
      toast.push(t('importSuccess'));
      if (result.warning) toast.push(t('importWarningMismatch'));
      await load();
      router.push(`/received-invoices/${result.id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setImportPending(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-s-navy">{t('title')}</h1>
          <p className="mt-1 text-sm text-s-muted">{t('subtitle')}</p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
            }}
          />
          <Button type="button" disabled={importPending} onClick={() => fileRef.current?.click()}>
            <Upload className="me-2 h-4 w-4" />
            {importPending ? tc('loading') : t('import')}
          </Button>
          <p className="max-w-xs text-end text-xs text-s-muted">{t('importHint')}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((key) => (
          <StatTabButton
            key={key}
            active={tab === key}
            label={key === 'all' ? t('tabAll') : t(`status_${key}`)}
            count={tabCounts[key]}
            showAmount={false}
            onClick={() => setTab(key)}
          />
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-s-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${t('supplier')}, ${t('number')}…`}
          className="w-full rounded-lg border border-s-border py-2 ps-10 pe-3 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-s-border bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-s-muted">{tc('loading')}</p>
        ) : pageRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <Inbox className="h-10 w-10 text-s-muted/50" />
            <p className="text-sm text-s-muted">{t('empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-s-border bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-s-muted">
                <tr>
                  <th className="px-4 py-3">{t('number')}</th>
                  <th className="px-4 py-3">{t('supplier')}</th>
                  <th className="px-4 py-3">{t('issueDate')}</th>
                  <th className="px-4 py-3">{t('amount')}</th>
                  <th className="px-4 py-3">{t('status')}</th>
                  <th className="px-4 py-3">{t('source')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-s-border">
                {pageRows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-slate-50/80"
                    onClick={() => router.push(`/received-invoices/${row.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-s-navy">
                      <div className="flex items-center gap-2">
                        {row.invoiceNumber}
                        {row.buyerMismatch ? (
                          <AlertTriangle
                            className="h-4 w-4 shrink-0 text-amber-500"
                            aria-label={t('buyerMismatch')}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.supplierName}</div>
                      {row.supplierSiren ? (
                        <div className="text-xs text-s-muted">{row.supplierSiren}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-s-muted">
                      {format(new Date(row.issueDate), 'dd MMM yyyy', { locale: frLocale })}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatEuro(Number(row.totalTtc))}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          statusClass[row.status]
                        )}
                      >
                        {t(`status_${row.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-s-muted">{t(`source_${row.source}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 ? (
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
    </div>
  );
}
