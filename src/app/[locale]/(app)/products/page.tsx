'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { Download, Package, Plus, Search, Trash2, Upload, Wrench } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { organizationManagesStock } from '@/lib/stock-management';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { ProductsImportModal } from '@/components/products/products-import-modal';
import { formatEuro } from '@/lib/format-money';
import { cn } from '@/lib/utils';
import {
  FilterDropdown,
  FilterOption,
  ListPagination,
  StatTabButton,
  paginateRows,
} from '@/components/list/list-ui';

type CategoryOption = { id: string; name: string };

type ProductRow = {
  id: string;
  name: string;
  kind: 'PRODUCT' | 'SERVICE';
  unit: string;
  unitPriceHt: unknown;
  vatRate: unknown;
  stockQuantity?: unknown;
  stockAlertThreshold?: unknown;
  category?: { id: string; name: string } | null;
};

type KindTab = 'all' | 'PRODUCT' | 'SERVICE';

const KIND_TABS: KindTab[] = ['all', 'PRODUCT', 'SERVICE'];

function matchesKindTab(row: ProductRow, tab: KindTab): boolean {
  if (tab === 'all') return true;
  return row.kind === tab;
}

function productPrice(row: ProductRow): number {
  return Number(row.unitPriceHt) || 0;
}

export default function ProductsPage() {
  const t = useTranslations('products');
  const tc = useTranslations('common');
  const toast = useToast();
  const { token, user } = useAuth();
  const managesStock = organizationManagesStock(user?.organization);
  const [list, setList] = useState<ProductRow[] | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<KindTab>('all');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [form, setForm] = useState({
    name: '',
    kind: 'SERVICE' as 'PRODUCT' | 'SERVICE',
    unitPrice: '',
    taxRate: '20',
    unit: 'unité',
    categoryId: '',
    stockQuantity: '0',
    stockAlertThreshold: '',
  });

  const isService = form.kind === 'SERVICE';

  const defaultProductForm = () => ({
    name: '',
    kind: (managesStock ? 'PRODUCT' : 'SERVICE') as 'PRODUCT' | 'SERVICE',
    unitPrice: '',
    taxRate: '20',
    unit: managesStock ? 'unité' : 'forfait',
    categoryId: '',
    stockQuantity: '0',
    stockAlertThreshold: '',
  });

  const visibleKindTabs: KindTab[] = managesStock ? KIND_TABS : ['all', 'SERVICE'];

  const load = useCallback(async () => {
    const data = await apiFetch<ProductRow[]>('/products');
    setList(data);
  }, []);

  const loadCategories = useCallback(async () => {
    const data = await apiFetch<CategoryOption[]>('/categories');
    setCategories(data);
  }, []);

  useEffect(() => {
    if (!token) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
    void loadCategories().catch(() => setCategories([]));
  }, [token, load, loadCategories, toast]);

  useEffect(() => {
    if (!token || !open) return;
    void loadCategories().catch(() => setCategories([]));
  }, [token, open, loadCategories]);

  useEffect(() => {
    setPage(1);
  }, [query, categoryFilter, activeTab, pageSize]);

  const baseFiltered = useMemo(() => {
    if (!list) return [];
    const q = query.trim().toLowerCase();
    return list.filter((p) => {
      if (categoryFilter !== 'all' && p.category?.id !== categoryFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category?.name.toLowerCase().includes(q) ||
        p.unit.toLowerCase().includes(q)
      );
    });
  }, [list, query, categoryFilter]);

  const tabStats = useMemo(() => {
    const stats: Record<KindTab, { count: number; amount: number }> = {
      all: { count: 0, amount: 0 },
      PRODUCT: { count: 0, amount: 0 },
      SERVICE: { count: 0, amount: 0 },
    };
    for (const row of baseFiltered) {
      const price = productPrice(row);
      stats.all.count += 1;
      stats.all.amount += price;
      if (row.kind === 'PRODUCT') {
        stats.PRODUCT.count += 1;
        stats.PRODUCT.amount += price;
      }
      if (row.kind === 'SERVICE') {
        stats.SERVICE.count += 1;
        stats.SERVICE.amount += price;
      }
    }
    return stats;
  }, [baseFiltered]);

  const filtered = useMemo(
    () => baseFiltered.filter((row) => matchesKindTab(row, activeTab)),
    [baseFiltered, activeTab]
  );

  const { rows: paginated, safePage } = paginateRows(filtered, page, pageSize);
  const rowStart = filtered.length ? (safePage - 1) * pageSize + 1 : 0;
  const rowEnd = Math.min(safePage * pageSize, filtered.length);

  async function onCreate() {
    try {
      const alertTh = form.stockAlertThreshold.trim();
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          kind: managesStock ? form.kind : 'SERVICE',
          unitPriceHt: parseFloat(form.unitPrice) || 0,
          vatRate: parseFloat(form.taxRate) || 20,
          unit: form.unit || (form.kind === 'SERVICE' ? 'forfait' : 'unité'),
          categoryId: form.categoryId || null,
          ...(form.kind === 'PRODUCT'
            ? {
                stockQuantity: parseFloat(form.stockQuantity) || 0,
                stockAlertThreshold: alertTh ? parseFloat(alertTh) : null,
              }
            : {}),
        }),
      });
      await load();
      toast.push(tc('save') + ' ✓');
      setOpen(false);
      setForm(defaultProductForm());
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onDelete() {
    if (!delId) return;
    try {
      await apiFetch(`/products/${delId}`, { method: 'DELETE' });
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
    const header = [
      t('name'),
      ...(managesStock ? [t('kind')] : []),
      t('category'),
      t('unit'),
      t('unitPrice'),
      t('taxRate'),
      ...(managesStock ? [t('stock')] : []),
    ];
    const rows = filtered.map((p) => [
      p.name,
      ...(managesStock ? [p.kind === 'SERVICE' ? t('kindService') : t('kindProduct')] : []),
      p.category?.name ?? '',
      p.unit,
      productPrice(p).toFixed(3),
      String(Number(p.vatRate)),
      ...(managesStock
        ? [
            p.kind === 'SERVICE'
              ? ''
              : p.stockQuantity !== undefined
                ? String(Number(p.stockQuantity))
                : '',
          ]
        : []),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produits-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function tabLabel(tab: KindTab): string {
    if (tab === 'all') return t('tabAll');
    if (tab === 'PRODUCT') return t('kindProduct');
    return t('kindService');
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
            onClick={() => {
              setForm(defaultProductForm());
              setOpen(true);
            }}
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
          {visibleKindTabs.map((tab) => (
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
          label={t('category')}
          valueLabel={
            categoryFilter !== 'all'
              ? categories.find((c) => c.id === categoryFilter)?.name
              : undefined
          }
        >
          <FilterOption active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
            {t('filterAll')}
          </FilterOption>
          {categories.map((c) => (
            <FilterOption
              key={c.id}
              active={categoryFilter === c.id}
              onClick={() => setCategoryFilter(c.id)}
            >
              {c.name}
            </FilterOption>
          ))}
        </FilterDropdown>
      </div>

      <section className="overflow-hidden rounded-xl border border-s-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-s-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-s-muted">
                <th className="px-5 py-3">{t('name')}</th>
                {managesStock ? <th className="px-5 py-3">{t('kind')}</th> : null}
                <th className="px-5 py-3">{t('category')}</th>
                <th className="px-5 py-3">{t('unitPrice')}</th>
                <th className="px-5 py-3">{t('taxRate')}</th>
                {managesStock ? <th className="px-5 py-3">{t('stock')}</th> : null}
                <th className="px-5 py-3 text-end">{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const lowStock =
                  p.kind === 'PRODUCT' &&
                  p.stockAlertThreshold != null &&
                  p.stockQuantity != null &&
                  Number(p.stockQuantity) <= Number(p.stockAlertThreshold);
                return (
                  <tr key={p.id} className="border-b border-s-border/50 hover:bg-slate-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                            p.kind === 'SERVICE'
                              ? 'bg-violet-50 text-violet-600'
                              : 'bg-slate-100 text-s-muted'
                          )}
                        >
                          {p.kind === 'SERVICE' ? (
                            <Wrench className="h-3.5 w-3.5" />
                          ) : (
                            <Package className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <span className="font-semibold text-[#1e3a8a]">{p.name}</span>
                      </div>
                    </td>
                    {managesStock ? (
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                            p.kind === 'SERVICE'
                              ? 'bg-violet-50 text-violet-700'
                              : 'bg-emerald-50 text-emerald-700'
                          )}
                        >
                          {p.kind === 'SERVICE' ? t('kindService') : t('kindProduct')}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-5 py-4 text-s-muted">{p.category?.name ?? '—'}</td>
                    <td className="px-5 py-4 font-semibold text-s-navy">
                      {formatEuro(productPrice(p))}
                    </td>
                    <td className="px-5 py-4 text-s-navy">{Number(p.vatRate)} %</td>
                    {managesStock ? (
                      <td className="px-5 py-4">
                        {p.kind === 'SERVICE' ? (
                          <span className="text-s-muted">{t('stockNotApplicable')}</span>
                        ) : (
                          <span
                            className={cn('font-mono', lowStock && 'font-semibold text-amber-700')}
                          >
                            {p.stockQuantity !== undefined
                              ? Number(p.stockQuantity).toLocaleString('fr-FR')
                              : '—'}
                          </span>
                        )}
                      </td>
                    ) : null}
                    <td className="px-5 py-4 text-end">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-s-muted hover:bg-red-50 hover:text-red-600"
                        title={tc('delete')}
                        onClick={() => setDelId(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
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
          {managesStock ? (
            <div>
              <label className="mb-1 block text-xs text-s-muted">{t('kind')}</label>
              <select
                className="w-full rounded-lg border border-s-border px-3 py-2 text-sm"
                value={form.kind}
                onChange={(e) => {
                  const kind = e.target.value as 'PRODUCT' | 'SERVICE';
                  setForm((f) => ({
                    ...f,
                    kind,
                    unit: kind === 'SERVICE' ? 'forfait' : f.unit === 'forfait' ? 'unité' : f.unit,
                  }));
                }}
              >
                <option value="PRODUCT">{t('kindProduct')}</option>
                <option value="SERVICE">{t('kindService')}</option>
              </select>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs text-s-muted">{t('category')}</label>
            <select
              className="w-full rounded-lg border border-s-border px-3 py-2 text-sm"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">{t('categoryNone')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            placeholder={t('unitPrice')}
            type="number"
            step="0.001"
            value={form.unitPrice}
            onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
          />
          <Input
            placeholder={t('taxRate')}
            type="number"
            value={form.taxRate}
            onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
          />
          <Input
            placeholder={t('unit')}
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
          />
          {!isService && managesStock ? (
            <>
              <Input
                placeholder={t('stockQuantity')}
                type="number"
                step="0.001"
                value={form.stockQuantity}
                onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
              />
              <Input
                placeholder={t('stockAlert')}
                type="number"
                step="0.001"
                value={form.stockAlertThreshold}
                onChange={(e) => setForm((f) => ({ ...f, stockAlertThreshold: e.target.value }))}
              />
            </>
          ) : null}
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

      <ProductsImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void load()}
      />
    </div>
  );
}
