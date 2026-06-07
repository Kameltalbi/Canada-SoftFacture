'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Download, Mail, MoreHorizontal, Plus, Search, Trash2, Upload, User } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { Switch } from '@/components/ui/switch';
import { ClientsImportModal } from '@/components/clients/clients-import-modal';
import {
  FilterDropdown,
  FilterOption,
  ListPagination,
  StatTabButton,
  paginateRows,
} from '@/components/list/list-ui';

type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  siren: string | null;
  city: string | null;
  isCompany?: boolean;
};

type ClientTab = 'all' | 'withEmail' | 'withoutEmail';

const CLIENT_TABS: ClientTab[] = ['all', 'withEmail', 'withoutEmail'];

function matchesClientTab(row: ClientRow, tab: ClientTab): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'withEmail':
      return !!row.email?.trim();
    case 'withoutEmail':
      return !row.email?.trim();
  }
}

export default function ClientsPage() {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const toast = useToast();
  const { token } = useAuth();
  const [list, setList] = useState<ClientRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>('all');
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    siren: '',
    city: '',
    isCompany: false,
  });

  const load = useCallback(async () => {
    const data = await apiFetch<ClientRow[]>('/clients');
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
  }, [query, cityFilter, activeTab, pageSize]);

  const cities = useMemo(() => {
    if (!list) return [];
    const set = new Set<string>();
    for (const c of list) {
      if (c.city?.trim()) set.add(c.city.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [list]);

  const baseFiltered = useMemo(() => {
    if (!list) return [];
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (cityFilter !== 'all' && (c.city?.trim() ?? '') !== cityFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.taxId?.toLowerCase().includes(q) ||
        c.siren?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
      );
    });
  }, [list, query, cityFilter]);

  const tabStats = useMemo(() => {
    const stats: Record<ClientTab, number> = { all: 0, withEmail: 0, withoutEmail: 0 };
    for (const row of baseFiltered) {
      stats.all += 1;
      if (matchesClientTab(row, 'withEmail')) stats.withEmail += 1;
      if (matchesClientTab(row, 'withoutEmail')) stats.withoutEmail += 1;
    }
    return stats;
  }, [baseFiltered]);

  const filtered = useMemo(
    () => baseFiltered.filter((row) => matchesClientTab(row, activeTab)),
    [baseFiltered, activeTab]
  );

  const { rows: paginated, safePage } = paginateRows(filtered, page, pageSize);
  const rowStart = filtered.length ? (safePage - 1) * pageSize + 1 : 0;
  const rowEnd = Math.min(safePage * pageSize, filtered.length);

  async function onCreate() {
    try {
      await apiFetch('/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          email: form.email.trim() ? form.email.trim() : null,
          phone: form.phone.trim() || null,
          taxId: form.taxId.trim() || null,
          siren: form.siren.trim() || null,
          city: form.city.trim() || null,
          isCompany: form.isCompany,
        }),
      });
      await load();
      toast.push(tc('save') + ' ✓');
      setOpen(false);
      setForm({ name: '', email: '', phone: '', taxId: '', siren: '', city: '', isCompany: false });
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onDelete() {
    if (!delId) return;
    try {
      await apiFetch(`/clients/${delId}`, { method: 'DELETE' });
      await load();
      toast.push(tc('delete') + ' ✓');
      setDelId(null);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  function exportCsv() {
    if (!filtered.length) {
      toast.push(tc('empty'), 'error');
      return;
    }
    const header = [t('name'), t('email'), t('phone'), t('siren'), t('taxId'), t('city')];
    const rows = filtered.map((c) => [
      c.name,
      c.email ?? '',
      c.phone ?? '',
      c.siren ?? '',
      c.taxId ?? '',
      c.city ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function tabLabel(tab: ClientTab): string {
    const keys: Record<ClientTab, string> = {
      all: 'tabAll',
      withEmail: 'tabWithEmail',
      withoutEmail: 'tabWithoutEmail',
    };
    return t(keys[tab]);
  }

  if (!list) {
    return <p className="text-sm text-s-muted">{tc('loading')}</p>;
  }

  return (
    <div className="space-y-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-s-navy">{t('title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            className="bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t('new')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="border border-s-border bg-white"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4" />
            {t('import')}
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
        </div>
      </div>

      <div className="mb-4 overflow-x-auto border-b border-s-border">
        <div className="flex min-w-max">
          {CLIENT_TABS.map((tab) => (
            <StatTabButton
              key={tab}
              active={activeTab === tab}
              label={tabLabel(tab)}
              count={tabStats[tab]}
              showAmount={false}
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
          label={t('city')}
          valueLabel={cityFilter !== 'all' ? cityFilter : undefined}
        >
          <FilterOption active={cityFilter === 'all'} onClick={() => setCityFilter('all')}>
            {t('filterAll')}
          </FilterOption>
          {cities.map((city) => (
            <FilterOption
              key={city}
              active={cityFilter === city}
              onClick={() => setCityFilter(city)}
            >
              {city}
            </FilterOption>
          ))}
        </FilterDropdown>
      </div>

      <section className="overflow-hidden rounded-xl border border-s-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-s-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-s-muted">
                <th className="px-5 py-3">{t('name')}</th>
                <th className="px-5 py-3">{t('email')}</th>
                <th className="px-5 py-3">{t('phone')}</th>
                <th className="px-5 py-3">{t('taxId')}</th>
                <th className="px-5 py-3">{t('city')}</th>
                <th className="px-5 py-3 text-end">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((c) => (
                <tr key={c.id} className="border-b border-s-border/50 hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-s-muted">
                        <User className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-semibold text-[#1e3a8a]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-s-navy">{c.email ?? '—'}</td>
                  <td className="px-5 py-4 text-s-navy">{c.phone ?? '—'}</td>
                  <td className="px-5 py-4 font-mono text-xs text-s-muted">{c.taxId ?? '—'}</td>
                  <td className="px-5 py-4 text-s-navy">{c.city ?? '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="rounded-lg p-2 text-s-muted hover:bg-slate-100 hover:text-s-navy"
                          title={t('actionEmail')}
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-lg p-2 text-s-muted hover:bg-red-50 hover:text-red-600"
                        title={tc('delete')}
                        onClick={() => setDelId(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-s-muted hover:bg-slate-100"
                        aria-hidden
                        disabled
                      >
                        <MoreHorizontal className="h-4 w-4 opacity-0" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? (
            <p className="py-16 text-center text-sm text-s-muted">{tc('empty')}</p>
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

      <Modal
        open={open}
        title={t('new')}
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={() => void onCreate()}>
              {tc('save')}
            </Button>
          </>
        }
      >
        <div className="mt-4 space-y-3">
          <Input
            placeholder={t('name')}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            placeholder={t('email')}
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            placeholder={t('phone')}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            placeholder={t('siren')}
            value={form.siren}
            onChange={(e) => setForm((f) => ({ ...f, siren: e.target.value }))}
          />
          <Input
            placeholder={t('taxId')}
            value={form.taxId}
            onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
          />
          <Input
            placeholder={t('city')}
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          />
          <div className="flex items-start justify-between gap-4 rounded-lg border border-s-border bg-slate-50 p-3">
            <div>
              <p className="text-sm font-medium text-s-navy">
                {t('isCompany_title') || 'Client professionnel (B2B)'}
              </p>
              <p className="mt-1 text-xs text-s-muted">
                {t('isCompany_hint') ||
                  'Active les mentions L441-10 sur les factures (pénalités de retard)'}
              </p>
            </div>
            <Switch
              checked={form.isCompany}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isCompany: checked }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!delId}
        title={tc('delete')}
        onClose={() => setDelId(null)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDelId(null)}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="danger" onClick={() => void onDelete()}>
              {tc('confirm')}
            </Button>
          </>
        }
      >
        <p>{t('deleteConfirm')}</p>
      </Modal>

      <ClientsImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void load()}
      />
    </div>
  );
}
