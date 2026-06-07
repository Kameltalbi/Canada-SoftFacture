'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ClipboardList,
  History,
  Package,
  Pencil,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { organizationManagesStock } from '@/lib/stock-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

type ProductStock = {
  id: string;
  name: string;
  unit: string;
  stockQuantity: unknown;
  stockAlertThreshold: unknown;
  canSetInitial?: boolean;
  category: { id: string; name: string } | null;
};

type StockCapabilities = {
  plan: string;
  canInventory: boolean;
};

type Movement = {
  id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  source: 'INITIAL' | 'INVOICE' | 'CREDIT_NOTE' | 'INVENTORY' | 'CANCEL_REVERSAL';
  quantity: unknown;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string };
  invoice: { id: string; number: string | null; kind: string } | null;
};

type StockResponse = {
  products: ProductStock[];
  alertCount: number;
  capabilities: StockCapabilities;
};

export function StockDashboard() {
  const t = useTranslations('stock');
  const tc = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const { token, user } = useAuth();
  const managesStock = organizationManagesStock(user?.organization);

  const [products, setProducts] = useState<ProductStock[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [capabilities, setCapabilities] = useState<StockCapabilities | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [filterProductId, setFilterProductId] = useState<string | null>(null);

  const [alertModal, setAlertModal] = useState<ProductStock | null>(null);
  const [alertValue, setAlertValue] = useState('');

  const [initialModal, setInitialModal] = useState<ProductStock | null>(null);
  const [initialQty, setInitialQty] = useState('');

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [inventoryRows, setInventoryRows] = useState<Record<string, string>>({});
  const [inventoryNote, setInventoryNote] = useState('');

  const loadMovements = useCallback(async (productId?: string | null) => {
    const q = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    return apiFetch<Movement[]>(`/stock/movements${q}`);
  }, []);

  const load = useCallback(async () => {
    const [stock, mov] = await Promise.all([
      apiFetch<StockResponse>('/stock'),
      loadMovements(filterProductId),
    ]);
    setProducts(stock.products);
    setAlertCount(stock.alertCount);
    setCapabilities(stock.capabilities);
    setMovements(mov);
  }, [filterProductId, loadMovements]);

  useEffect(() => {
    if (user && !managesStock) {
      router.replace('/settings?s=stock');
    }
  }, [user, managesStock, router]);

  useEffect(() => {
    if (!token || !managesStock) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
  }, [token, managesStock, load, toast]);

  useEffect(() => {
    if (!token || !managesStock) return;
    void loadMovements(filterProductId)
      .then(setMovements)
      .catch(() => undefined);
  }, [token, managesStock, filterProductId, loadMovements]);

  const canInventory = capabilities?.canInventory ?? false;

  const stats = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + Number(p.stockQuantity), 0);
    return { productCount: products.length, totalUnits, alertCount };
  }, [products, alertCount]);

  function isLow(p: ProductStock) {
    const th = p.stockAlertThreshold;
    if (th === null || th === undefined) return false;
    return Number(p.stockQuantity) <= Number(th);
  }

  function openAlertEdit(p: ProductStock) {
    const th = p.stockAlertThreshold;
    setAlertValue(th === null || th === undefined ? '' : String(Number(th)));
    setAlertModal(p);
  }

  function openInitialEdit(p: ProductStock) {
    setInitialQty(String(Number(p.stockQuantity)));
    setInitialModal(p);
  }

  async function saveAlert() {
    if (!alertModal) return;
    const trimmed = alertValue.trim();
    const threshold = trimmed === '' ? null : parseFloat(trimmed);
    if (trimmed !== '' && (!Number.isFinite(threshold) || threshold! < 0)) {
      toast.push(t('validation'), 'error');
      return;
    }
    try {
      await apiFetch(`/stock/products/${alertModal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stockAlertThreshold: threshold }),
      });
      await load();
      setAlertModal(null);
      toast.push(t('alertSaved'));
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function saveInitial() {
    if (!initialModal) return;
    const qty = parseFloat(initialQty);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.push(t('validation'), 'error');
      return;
    }
    try {
      await apiFetch(`/stock/products/${initialModal.id}/initial`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: qty }),
      });
      await load();
      setInitialModal(null);
      toast.push(t('initialSaved'));
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  function openInventory() {
    const rows: Record<string, string> = {};
    for (const p of products) {
      rows[p.id] = String(Number(p.stockQuantity));
    }
    setInventoryRows(rows);
    setInventoryNote('');
    setInventoryOpen(true);
  }

  async function submitInventory() {
    const items = products.map((p) => ({
      productId: p.id,
      countedQuantity: parseFloat(inventoryRows[p.id] ?? '0') || 0,
    }));
    try {
      await apiFetch('/stock/inventory', {
        method: 'POST',
        body: JSON.stringify({ items, note: inventoryNote.trim() || null }),
      });
      await load();
      setInventoryOpen(false);
      toast.push(t('inventorySaved'));
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  function movementLabel(m: Movement) {
    if (m.source === 'INVOICE' && m.invoice) {
      return t('sourceInvoice', { number: m.invoice.number ?? '—' });
    }
    if (m.source === 'CREDIT_NOTE' && m.invoice) {
      return t('sourceCredit', { number: m.invoice.number ?? '—' });
    }
    if (m.source === 'INITIAL') return t('sourceInitial');
    if (m.source === 'INVENTORY') return t('sourceInventory');
    if (m.source === 'CANCEL_REVERSAL') return t('sourceCancel');
    return t(`type_${m.type}`);
  }

  function movementIcon(m: Movement) {
    if (m.type === 'OUT') return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
    if (m.type === 'IN') return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
    return <ClipboardList className="h-3.5 w-3.5 text-s-muted" />;
  }

  if (user && !managesStock) {
    return <p className="text-sm text-s-muted">{tc('loading')}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-s-navy">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-s-muted">{t('subtitle')}</p>
          <p className="mt-2 max-w-2xl text-xs text-s-muted">{t('rulesHint')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canInventory ? (
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={openInventory}
              disabled={products.length === 0}
            >
              <ClipboardList className="h-4 w-4" />
              {t('runInventory')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="gap-2 text-s-muted"
              onClick={() => {
                toast.push(t('inventoryUpgrade'));
                router.push('/subscription');
              }}
            >
              <ClipboardList className="h-4 w-4" />
              {t('inventoryBusiness')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-s-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-s-muted">{t('statProducts')}</p>
          <p className="mt-1 text-2xl font-bold text-s-navy">{stats.productCount}</p>
        </div>
        <div className="rounded-xl border border-s-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-s-muted">{t('statUnits')}</p>
          <p className="mt-1 text-2xl font-bold text-s-navy">
            {stats.totalUnits.toLocaleString('fr-FR')}
          </p>
        </div>
        <div
          className={`rounded-xl border p-4 shadow-sm ${
            stats.alertCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-s-border bg-white'
          }`}
        >
          <p className="text-xs font-medium uppercase text-s-muted">{t('statAlerts')}</p>
          <p
            className={`mt-1 text-2xl font-bold ${
              stats.alertCount > 0 ? 'text-amber-700' : 'text-s-navy'
            }`}
          >
            {stats.alertCount}
          </p>
        </div>
      </div>

      {alertCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('alerts', { count: alertCount })}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-s-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50/80 text-xs font-semibold uppercase text-s-muted">
                <th className="px-5 py-3">{t('product')}</th>
                <th className="px-5 py-3">{t('category')}</th>
                <th className="px-5 py-3 text-end">{t('quantity')}</th>
                <th className="px-5 py-3 text-end">{t('alertThreshold')}</th>
                <th className="px-5 py-3 text-end">{t('status')}</th>
                <th className="px-5 py-3 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-s-muted">
                    {t('noProducts')}
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-s-border/50 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-s-navy">
                      <span className="inline-flex items-center gap-2">
                        <Package className="h-4 w-4 text-s-muted" />
                        {p.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-s-muted">{p.category?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-end font-mono tabular-nums">
                      {Number(p.stockQuantity).toLocaleString('fr-FR')}{' '}
                      <span className="text-s-muted">{p.unit}</span>
                    </td>
                    <td className="px-5 py-3 text-end text-s-muted">
                      {p.stockAlertThreshold != null
                        ? Number(p.stockAlertThreshold).toLocaleString('fr-FR')
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-end">
                      {isLow(p) ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {t('low')}
                        </span>
                      ) : (
                        <span className="text-xs text-s-muted">OK</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2"
                          onClick={() => {
                            setFilterProductId((cur) => (cur === p.id ? null : p.id));
                          }}
                          title={t('viewHistory')}
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1 px-2"
                          onClick={() => openAlertEdit(p)}
                          title={t('editAlert')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {p.canSetInitial ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => openInitialEdit(p)}
                          >
                            {t('setInitial')}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-s-border bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-s-navy">{t('recentMovements')}</h2>
          {filterProductId ? (
            <button
              type="button"
              className="text-xs text-[#1e3a8a] hover:underline"
              onClick={() => setFilterProductId(null)}
            >
              {t('clearFilter')}
            </button>
          ) : null}
        </div>
        {movements.length === 0 ? (
          <p className="text-sm text-s-muted">{t('noMovements')}</p>
        ) : (
          <ul className="divide-y divide-s-border/40">
            {movements.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2">
                  {movementIcon(m)}
                  <span className="font-medium text-s-navy">{m.product.name}</span>
                  <span className="text-s-muted">· {movementLabel(m)}</span>
                  {m.note && m.source !== 'INVOICE' && m.source !== 'CREDIT_NOTE' ? (
                    <span className="text-s-muted">({m.note})</span>
                  ) : null}
                </span>
                <span className="flex items-center gap-3 text-s-muted">
                  <span
                    className={
                      m.type === 'OUT' ? 'font-mono text-red-600' : 'font-mono text-emerald-700'
                    }
                  >
                    {m.type === 'OUT' ? '−' : m.type === 'IN' ? '+' : ''}
                    {Number(m.quantity).toLocaleString('fr-FR')}
                  </span>
                  {m.invoice ? (
                    <Link
                      href={`/invoices/${m.invoice.id}`}
                      className="text-xs text-[#1e3a8a] hover:underline"
                    >
                      {t('openDocument')}
                    </Link>
                  ) : null}
                  <span className="text-xs">
                    {format(new Date(m.createdAt), 'dd/MM/yyyy HH:mm')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={!!alertModal}
        title={t('editAlertTitle')}
        onClose={() => setAlertModal(null)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setAlertModal(null)}>
              {tc('cancel')}
            </Button>
            <Button type="button" onClick={() => void saveAlert()}>
              {tc('save')}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-s-muted">{alertModal?.name}</p>
        <label className="mb-1 block text-xs text-s-muted">{t('alertThreshold')}</label>
        <Input
          type="number"
          min={0}
          step="0.001"
          placeholder={t('alertPlaceholder')}
          value={alertValue}
          onChange={(e) => setAlertValue(e.target.value)}
        />
        <p className="mt-2 text-xs text-s-muted">{t('alertHelp')}</p>
      </Modal>

      <Modal
        open={!!initialModal}
        title={t('setInitialTitle')}
        onClose={() => setInitialModal(null)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setInitialModal(null)}>
              {tc('cancel')}
            </Button>
            <Button type="button" onClick={() => void saveInitial()}>
              {tc('save')}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-s-muted">{initialModal?.name}</p>
        <label className="mb-1 block text-xs text-s-muted">{t('quantity')}</label>
        <Input
          type="number"
          min={0}
          step="0.001"
          value={initialQty}
          onChange={(e) => setInitialQty(e.target.value)}
        />
        <p className="mt-2 text-xs text-s-muted">{t('initialHelp')}</p>
      </Modal>

      <Modal
        open={inventoryOpen}
        title={t('inventoryTitle')}
        onClose={() => setInventoryOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setInventoryOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              className="bg-[#1e3a8a] text-white"
              onClick={() => void submitInventory()}
            >
              {t('inventorySubmit')}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-s-muted">{t('inventoryDesc')}</p>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-s-border/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-s-navy">{p.name}</p>
                <p className="text-xs text-s-muted">
                  {t('systemQty')}: {Number(p.stockQuantity).toLocaleString('fr-FR')} {p.unit}
                </p>
              </div>
              <Input
                type="number"
                min={0}
                step="0.001"
                className="w-28 text-end"
                value={inventoryRows[p.id] ?? ''}
                onChange={(e) => setInventoryRows((rows) => ({ ...rows, [p.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-xs text-s-muted">{t('note')}</label>
          <Input value={inventoryNote} onChange={(e) => setInventoryNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
