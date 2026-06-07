'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { FileText, Plus, RefreshCw, Search, ShoppingCart, Trash2, User } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { calcLine } from '@/lib/money';
import { toNumber, cn } from '@/lib/utils';
import {
  InvoiceEditorShell,
  type InvoiceEditorPanel,
} from '@/components/invoices/invoice-editor-rail';
import type { DocumentSettings } from '@/components/invoices/document-settings-drawer';
import {
  DocumentEditorActionBar,
  DOCUMENT_TABLE_HEADER_CLASS,
} from '@/components/invoices/document-editor-action-bar';

type ClientOpt = { id: string; name: string };
type ProductOpt = { id: string; name: string; unitPriceHt: unknown; vatRate: unknown };
type Line = {
  description: string;
  quantity: number;
  unitPriceHt: number;
  taxRate: number;
  productId: string | null;
};

const VAT_RATES = [20, 10, 5.5, 2.1, 0] as const;

const lineFieldClass =
  'h-10 rounded-lg border border-s-border bg-white px-3 py-2 text-sm text-s-navy shadow-sm transition placeholder:text-s-muted focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20';

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function emptyLine(vat: number): Line {
  return { description: '', quantity: 1, unitPriceHt: 0, taxRate: vat, productId: null };
}

function lineGridClass(showVat: boolean) {
  return showVat
    ? 'grid-cols-[minmax(180px,2fr)_80px_100px_80px_minmax(120px,1fr)_40px]'
    : 'grid-cols-[minmax(180px,2fr)_80px_100px_minmax(120px,1fr)_40px]';
}

export default function NewRecurringInvoicePage() {
  const t = useTranslations('recurring');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const { token, user } = useAuth();
  const defaultVat = toNumber(user?.organization?.defaultVatRate ?? 20);
  const [clients, setClients] = useState<ClientOpt[] | null>(null);
  const [products, setProducts] = useState<ProductOpt[] | null>(null);
  const [clientQuery, setClientQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState<'MONTHLY' | 'WEEKLY' | 'QUARTERLY' | 'YEARLY'>(
    'MONTHLY'
  );
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [dueDaysAfter, setDueDaysAfter] = useState(30);
  const [autoValidate, setAutoValidate] = useState(true);
  const [notes, setNotes] = useState('');
  const [activePanel, setActivePanel] = useState<InvoiceEditorPanel>(null);
  const [settings, setSettings] = useState<DocumentSettings>(() => ({
    documentLanguage: 'fr',
    currency: user?.organization?.defaultCurrency ?? 'CAD',
    applyVat: true,
    applyFiscalStamp: false,
    fiscalStamp: 0,
    discountEnabled: false,
    discountRate: 0,
    showCurrencyOnLines: true,
    appliedDepositId: null,
  }));
  const [lines, setLines] = useState<Line[]>(() => [emptyLine(defaultVat)]);
  const [pending, setPending] = useState(false);
  const [productPickerIdx, setProductPickerIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      apiFetch<ClientOpt[]>('/clients'),
      apiFetch<ProductOpt[]>('/products'),
    ]);
    setClients(c);
    setProducts(p);
  }, []);

  useEffect(() => {
    if (!token) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
  }, [token, load, toast]);

  useEffect(() => {
    if (user?.organization?.defaultCurrency) {
      setSettings((prev) => ({ ...prev, currency: user.organization!.defaultCurrency }));
    }
  }, [user?.organization?.defaultCurrency]);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientQuery]);

  const currency = settings.currency;
  const showLineVat = settings.applyVat;
  const lineGrid = lineGridClass(showLineVat);

  const totals = useMemo(() => {
    let ht = 0;
    let vat = 0;
    let ttc = 0;
    const globalFactor = settings.discountEnabled ? 1 - settings.discountRate / 100 : 1;

    for (const l of lines) {
      const calc = calcLine(
        l.quantity || 0,
        l.unitPriceHt || 0,
        settings.applyVat ? l.taxRate || 0 : 0
      );
      ht += toNumber(calc.lineTotalHt) * globalFactor;
      vat += toNumber(calc.lineVat) * globalFactor;
      ttc += toNumber(calc.lineTotalTtc) * globalFactor;
    }
    if (settings.applyFiscalStamp) ttc += settings.fiscalStamp || 0;
    return { ht, vat, ttc };
  }, [lines, settings]);

  function addLine() {
    setLines((prev) => [...prev, emptyLine(defaultVat)]);
  }

  function removeLine(index: number) {
    setLines((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [emptyLine(defaultVat)];
    });
    setProductPickerIdx(null);
  }

  function applyProduct(index: number, productId: string) {
    const p = products?.find((x) => x.id === productId);
    if (!p) return;
    setLines((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              productId,
              description: p.name,
              unitPriceHt: toNumber(p.unitPriceHt),
              taxRate: toNumber(p.vatRate),
            }
          : l
      )
    );
    setProductPickerIdx(null);
  }

  function lineTotalHt(line: Line) {
    const globalFactor = settings.discountEnabled ? 1 - settings.discountRate / 100 : 1;
    const calc = calcLine(
      line.quantity || 0,
      line.unitPriceHt || 0,
      settings.applyVat ? line.taxRate || 0 : 0
    );
    return toNumber(calc.lineTotalHt) * globalFactor;
  }

  async function onSubmit() {
    const payloadLines = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPriceHt: l.unitPriceHt,
        taxRate: l.taxRate,
        productId: l.productId,
      }));
    if (!clientId || !payloadLines.length) {
      toast.push(t('validationClientLines'), 'error');
      return;
    }
    setPending(true);
    try {
      const { appliedDepositId: _d, ...docSettings } = settings;
      const created = await apiFetch<{ id: string }>('/recurring-invoices', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          title: title.trim() || null,
          frequency,
          dayOfMonth: frequency === 'WEEKLY' ? null : dayOfMonth,
          startDate: new Date(startDate).toISOString(),
          endDate: endDate ? new Date(endDate).toISOString() : null,
          dueDaysAfter,
          autoValidate,
          notes: notes.trim() || null,
          lines: payloadLines,
          ...docSettings,
        }),
      });
      toast.push(t('created'));
      router.push(`/recurring-invoices/${created.id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setPending(false);
    }
  }

  if (!clients || !products) {
    return <p className="text-sm text-s-muted">{tc('loading')}</p>;
  }

  return (
    <InvoiceEditorShell
      settings={settings}
      onSettingsChange={setSettings}
      notes={notes}
      onNotesChange={setNotes}
      activePanel={activePanel}
      onPanelChange={setActivePanel}
      documentType="recurring"
    >
      <div className="space-y-4 pb-10">
        <DocumentEditorActionBar
          variant="template"
          title={t('newTitle')}
          subtitle={title.trim() || t('untitled')}
          saveAndFinalizeLabel={t('create')}
          saveDraftLabel=""
          previewLabel=""
          loadingLabel={tc('loading')}
          deleteAriaLabel=""
          downloadAriaLabel=""
          closeAriaLabel={tc('cancel')}
          pending={pending ? 'finalize' : null}
          onSaveAndFinalize={() => void onSubmit()}
          onClose={() => router.push('/recurring-invoices')}
        />

        <section className="rounded-lg border border-s-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-s-muted">
            <RefreshCw className="h-4 w-4" />
            {t('title')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-s-muted">
                {t('labelField')}
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('labelPlaceholder')}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-s-muted">
                {t('frequency')}
              </label>
              <select
                className="w-full rounded-lg border border-s-border bg-white px-3 py-2.5 text-sm"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as typeof frequency)}
              >
                <option value="WEEKLY">{t('freq_WEEKLY')}</option>
                <option value="MONTHLY">{t('freq_MONTHLY')}</option>
                <option value="QUARTERLY">{t('freq_QUARTERLY')}</option>
                <option value="YEARLY">{t('freq_YEARLY')}</option>
              </select>
            </div>
            {frequency !== 'WEEKLY' ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-s-muted">
                  {t('dayOfMonth')}
                </label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                />
              </div>
            ) : (
              <div />
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-s-muted">
                {t('startDate')}
              </label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-s-muted">
                {t('endDate')}
              </label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-s-muted">
                {t('dueDaysAfter')}
              </label>
              <Input
                type="number"
                min={0}
                value={dueDaysAfter}
                onChange={(e) => setDueDaysAfter(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-s-navy">
              <input
                type="checkbox"
                checked={autoValidate}
                onChange={(e) => setAutoValidate(e.target.checked)}
                className="h-4 w-4 accent-brand-blue"
              />
              {t('autoValidate')}
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-s-border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-s-navy">
            <User className="h-4 w-4 text-s-muted" />
            {t('client')}
          </h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-s-muted" />
              <Input
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
                placeholder="Rechercher un client…"
                className="ps-9"
              />
            </div>
            <Link href="/clients">
              <Button
                type="button"
                variant="ghost"
                className="border border-s-border bg-white px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <select
            className="w-full rounded-lg border border-s-border bg-white px-3 py-2.5 text-sm"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">— {t('client')} —</option>
            {filteredClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-lg border border-s-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-s-navy">
              <FileText className="h-4 w-4 text-s-muted" />
              {t('lines')}
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 text-sm font-medium text-brand-blue hover:underline"
            >
              <Plus className="h-4 w-4" />
              {t('addLine')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className={cn(DOCUMENT_TABLE_HEADER_CLASS, lineGrid)}>
                <span>{t('lineDescription')}</span>
                <span>Qté</span>
                <span>Prix HT</span>
                {showLineVat ? <span>TVA</span> : null}
                <span className="text-end">Total HT</span>
                <span />
              </div>

              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'grid items-start gap-2 border-b border-s-border/60 px-3 py-3',
                    lineGrid
                  )}
                >
                  <div className="space-y-2">
                    <Input
                      value={line.description}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx ? { ...l, description: e.target.value } : l
                          )
                        )
                      }
                      placeholder={t('lineDescription')}
                      className={lineFieldClass}
                    />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setProductPickerIdx(productPickerIdx === idx ? null : idx)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-brand-blue/40 bg-brand-blue-soft px-2.5 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue-soft/80"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        {t('productOptional')}
                      </button>
                      {productPickerIdx === idx ? (
                        <div className="absolute start-0 top-full z-20 mt-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-s-border bg-white py-1 shadow-lg">
                          {products.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                              onClick={() => applyProduct(idx, p.id)}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <Input
                    type="number"
                    step="0.001"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, quantity: parseFloat(e.target.value) || 0 } : l
                        )
                      )
                    }
                    className={lineFieldClass}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={line.unitPriceHt}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) =>
                          i === idx ? { ...l, unitPriceHt: parseFloat(e.target.value) || 0 } : l
                        )
                      )
                    }
                    className={lineFieldClass}
                  />
                  {showLineVat ? (
                    <select
                      value={line.taxRate}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, i) =>
                            i === idx ? { ...l, taxRate: parseFloat(e.target.value) } : l
                          )
                        )
                      }
                      className={lineFieldClass}
                    >
                      {VAT_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <div className="flex h-10 items-center justify-end text-sm font-medium text-s-navy">
                    {formatMoney(lineTotalHt(line), currency)}
                  </div>
                  <div className="flex h-10 items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                      aria-label={tc('delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex justify-end">
          <div className="w-full max-w-sm rounded-lg border border-s-border bg-white text-sm">
            <div className="flex items-center justify-between border-b border-s-border/80 px-4 py-3">
              <span className="text-s-muted">Total HT</span>
              <span className="font-medium text-s-navy">{formatMoney(totals.ht, currency)}</span>
            </div>
            {showLineVat ? (
              <div className="flex items-center justify-between border-b border-s-border/80 px-4 py-3">
                <span className="text-s-muted">TVA</span>
                <span className="font-medium text-s-navy">{formatMoney(totals.vat, currency)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between bg-slate-100 px-4 py-3.5">
              <span className="font-bold text-s-navy">Total TTC</span>
              <span className="font-bold text-s-navy">{formatMoney(totals.ttc, currency)}</span>
            </div>
          </div>
        </section>
      </div>
    </InvoiceEditorShell>
  );
}
