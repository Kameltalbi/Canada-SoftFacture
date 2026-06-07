'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { FileText, Plus, Search, ShoppingCart, Trash2, User } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { apiFetch, downloadQuotePdfFromApi } from '@/lib/api-client';
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
  QuotePreviewModal,
  type QuotePreviewPayload,
} from '@/components/invoices/quote-preview-modal';
import type { QuotePreviewData } from '@/components/invoices/quote-preview-document';
import type { QuotePdfData } from '@/components/invoices/quote-pdf';
import { QuoteDoc } from '@/components/invoices/quote-pdf';
import {
  DocumentEditorActionBar,
  DOCUMENT_TABLE_HEADER_CLASS,
} from '@/components/invoices/document-editor-action-bar';
import { useDocumentNumberPreview } from '@/hooks/use-document-number-preview';

type Line = {
  description: string;
  quantity: number;
  unitPriceHt: number;
  taxRate: number;
  discountRate: number;
  productId: string | null;
};

type ClientOpt = {
  id: string;
  name: string;
  taxId?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string;
};
type ProductOpt = { id: string; name: string; unitPriceHt: unknown; vatRate: unknown };

const VAT_RATES = [20, 10, 5.5, 2.1, 0] as const;

const lineFieldClass =
  'h-10 rounded-lg border border-s-border bg-white px-3 py-2 text-sm text-s-navy shadow-sm transition placeholder:text-s-muted focus:border-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20';

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function emptyLine(defaultVat: number): Line {
  return {
    description: '',
    quantity: 1,
    unitPriceHt: 0,
    taxRate: defaultVat,
    discountRate: 0,
    productId: null,
  };
}

function TotalsPanel({
  ht,
  vat,
  ttc,
  netPay,
  currency,
  labels,
  showVat,
}: {
  ht: number;
  vat: number;
  ttc: number;
  netPay: number;
  currency: string;
  showVat: boolean;
  labels: { subtotalHt: string; vat: string; totalTtc: string; netToPay: string };
}) {
  return (
    <div className="w-full max-w-sm rounded-lg border border-s-border bg-white text-sm">
      <div className="flex items-center justify-between border-b border-s-border/80 px-4 py-3">
        <span className="text-s-muted">{labels.subtotalHt}</span>
        <span className="font-medium text-s-navy">{formatMoney(ht, currency)}</span>
      </div>
      {showVat ? (
        <div className="flex items-center justify-between border-b border-s-border/80 px-4 py-3">
          <span className="text-s-muted">{labels.vat}</span>
          <span className="font-medium text-s-navy">{formatMoney(vat, currency)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between border-b border-s-border px-4 py-3">
        <span className="font-bold text-s-navy">{labels.totalTtc}</span>
        <span className="font-bold text-s-navy">{formatMoney(ttc, currency)}</span>
      </div>
      <div className="flex items-center justify-between bg-slate-100 px-4 py-3.5">
        <span className="font-bold text-s-navy">{labels.netToPay}</span>
        <span className="font-bold text-s-navy">{formatMoney(netPay, currency)}</span>
      </div>
    </div>
  );
}

function lineGridClass(showDiscount: boolean, showVat: boolean) {
  if (showDiscount && showVat) {
    return 'grid-cols-[minmax(180px,2fr)_80px_100px_90px_80px_minmax(120px,1fr)_40px]';
  }
  if (showDiscount) {
    return 'grid-cols-[minmax(180px,2fr)_80px_100px_90px_minmax(120px,1fr)_40px]';
  }
  if (showVat) {
    return 'grid-cols-[minmax(180px,2fr)_80px_100px_80px_minmax(120px,1fr)_40px]';
  }
  return 'grid-cols-[minmax(180px,2fr)_80px_100px_minmax(120px,1fr)_40px]';
}

export default function NewQuotePage() {
  const t = useTranslations('quotes');
  const tc = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const { token, user } = useAuth();
  const [clients, setClients] = useState<ClientOpt[] | null>(null);
  const [products, setProducts] = useState<ProductOpt[] | null>(null);
  const [clientQuery, setClientQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [subject, setSubject] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [activePanel, setActivePanel] = useState<InvoiceEditorPanel>(null);
  const defaultVat = toNumber(user?.organization?.defaultVatRate ?? 20);
  const [settings, setSettings] = useState<DocumentSettings>(() => ({
    documentLanguage: 'fr',
    currency: user?.organization?.defaultCurrency ?? 'EUR',
    applyVat: true,
    applyFiscalStamp: false,
    fiscalStamp: 0,
    discountEnabled: false,
    discountRate: 0,
    showCurrencyOnLines: true,
    appliedDepositId: null,
  }));
  const [lines, setLines] = useState<Line[]>(() => [emptyLine(defaultVat)]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [pending, setPending] = useState<'draft' | 'finalize' | 'delete' | null>(null);
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

  const { nextNumber: previewNumber, loading: previewLoading } = useDocumentNumberPreview(
    'quote',
    issueDate
  );
  const draftNumber = previewNumber ?? 'DEV-…';
  const currency = settings.currency;
  const showLineDiscount = settings.discountEnabled;
  const showLineVat = settings.applyVat;
  const lineGrid = lineGridClass(showLineDiscount, showLineVat);

  const totals = useMemo(() => {
    let ht = 0;
    let vat = 0;
    let ttc = 0;
    const globalFactor = settings.discountEnabled ? 1 - settings.discountRate / 100 : 1;

    for (const l of lines) {
      const lineFactor = settings.discountEnabled ? 1 - (l.discountRate || 0) / 100 : 1;
      const calc = calcLine(
        l.quantity || 0,
        l.unitPriceHt || 0,
        settings.applyVat ? l.taxRate || 0 : 0
      );
      ht += toNumber(calc.lineTotalHt) * lineFactor * globalFactor;
      vat += toNumber(calc.lineVat) * lineFactor * globalFactor;
      ttc += toNumber(calc.lineTotalTtc) * lineFactor * globalFactor;
    }
    if (settings.applyFiscalStamp) ttc += settings.fiscalStamp || 0;
    const netPay = ttc;
    return { ht, vat, ttc, netPay };
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
    const factor = settings.discountEnabled ? 1 - (line.discountRate || 0) / 100 : 1;
    const globalFactor = settings.discountEnabled ? 1 - settings.discountRate / 100 : 1;
    const calc = calcLine(
      line.quantity || 0,
      line.unitPriceHt || 0,
      settings.applyVat ? line.taxRate || 0 : 0
    );
    return toNumber(calc.lineTotalHt) * factor * globalFactor;
  }

  function buildPayload() {
    const payloadLines = lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPriceHt: l.unitPriceHt,
        taxRate: l.taxRate,
        productId: l.productId,
      }));

    const mergedNotes = [subject.trim() && `Sujet : ${subject.trim()}`, notes.trim()]
      .filter(Boolean)
      .join('\n\n');

    return { payloadLines, mergedNotes };
  }

  function openPreview() {
    setPreviewOpen(true);
  }

  const persistDraft = useCallback(async (): Promise<string> => {
    const { payloadLines, mergedNotes } = buildPayload();
    if (!clientId) {
      throw new Error('Sélectionnez un client.');
    }
    if (!payloadLines.length) {
      throw new Error('Ajoutez au moins une ligne.');
    }

    const body = {
      clientId,
      issueDate: new Date(issueDate).toISOString(),
      validUntil: validUntil.trim() ? new Date(validUntil).toISOString() : null,
      notes: mergedNotes || undefined,
      ...settings,
      lines: payloadLines,
    };

    if (savedDraftId) {
      await apiFetch(`/quotes/${savedDraftId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return savedDraftId;
    }

    const q = await apiFetch<{ id: string }>('/quotes', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setSavedDraftId(q.id);
    return q.id;
  }, [clientId, issueDate, validUntil, settings, savedDraftId, lines, notes, subject]);

  async function saveDraft() {
    setPending('draft');
    try {
      const id = await persistDraft();
      toast.push(t('previewDraftSaved'));
      router.push(`/quotes/${id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    } finally {
      setPending(null);
    }
  }

  async function saveAndFinalize() {
    setPending('finalize');
    try {
      const id = await persistDraft();
      await apiFetch(`/quotes/${id}/validate`, { method: 'POST' });
      toast.push(t('previewFinalized'));
      router.push(`/quotes/${id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    } finally {
      setPending(null);
    }
  }

  async function deleteDraft() {
    if (!savedDraftId) {
      router.push('/quotes');
      return;
    }
    if (!window.confirm(t('deleteConfirm'))) return;
    setPending('delete');
    try {
      await apiFetch(`/quotes/${savedDraftId}`, { method: 'DELETE' });
      toast.push(t('toastDeleted'));
      router.push('/quotes');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    } finally {
      setPending(null);
    }
  }

  const selectedClient = useMemo(
    () => clients?.find((c) => c.id === clientId),
    [clients, clientId]
  );

  const displayValidUntil = useMemo(() => {
    if (validUntil.trim()) return validUntil;
    const d = new Date(issueDate);
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  }, [validUntil, issueDate]);

  const previewPayload = useMemo((): QuotePreviewPayload => {
    const { payloadLines, mergedNotes } = buildPayload();
    return {
      clientId,
      issueDate,
      validUntil: validUntil.trim() ? validUntil : null,
      notes: mergedNotes || undefined,
      settings,
      lines: payloadLines,
    };
  }, [clientId, issueDate, validUntil, lines, notes, settings, subject]);

  const previewData = useMemo((): QuotePreviewData => {
    const globalFactor = settings.discountEnabled ? 1 - settings.discountRate / 100 : 1;
    const previewLines = lines
      .filter((l) => l.description.trim())
      .map((l) => {
        const lineFactor = settings.discountEnabled ? 1 - (l.discountRate || 0) / 100 : 1;
        const calc = calcLine(
          l.quantity || 0,
          l.unitPriceHt || 0,
          settings.applyVat ? l.taxRate || 0 : 0
        );
        return {
          description: l.description,
          quantity: l.quantity,
          unitPriceHt: l.unitPriceHt,
          taxRate: l.taxRate,
          lineTotalHt: toNumber(calc.lineTotalHt) * lineFactor * globalFactor,
        };
      });

    const org = user?.organization;
    return {
      number: draftNumber,
      issueDate,
      validUntil: displayValidUntil,
      companyName: org?.name ?? 'Mon entreprise',
      companyTax: org?.taxMatricule,
      companyAddress: org?.address,
      companyCity: org?.city,
      clientName: selectedClient?.name ?? '—',
      clientTax: selectedClient?.taxId,
      clientAddress: selectedClient?.address,
      clientCity: selectedClient?.city,
      subject: subject.trim() || null,
      notes: notes.trim() || null,
      currency,
      applyVat: settings.applyVat,
      lines: previewLines,
      subtotalHt: totals.ht,
      vatTotal: totals.vat,
      totalTtc: totals.ttc,
      netToPay: totals.netPay,
      labels: {
        client: 'Client',
        designation: 'Désignation',
        qty: 'Qté.',
        unit: 'Unité',
        unitPrice: 'Prix U. HT',
        totalHt: 'Total HT',
        subtotalHt: t('subtotalHt'),
        vat: t('vat'),
        totalTtc: t('totalTtc'),
        netToPay: t('netToPay'),
        issueDate: t('date'),
        validUntil: t('validUntil'),
      },
    };
  }, [
    selectedClient,
    lines,
    settings,
    user?.organization,
    draftNumber,
    issueDate,
    displayValidUntil,
    subject,
    notes,
    currency,
    totals,
    t,
  ]);

  const previewPdfData = useMemo((): QuotePdfData => {
    const org = user?.organization;
    return {
      number: draftNumber,
      issueDate: new Date(issueDate).toLocaleDateString('fr-FR'),
      validUntil: displayValidUntil
        ? new Date(displayValidUntil).toLocaleDateString('fr-FR')
        : null,
      companyName: org?.name ?? 'Mon entreprise',
      companyTax: org?.taxMatricule,
      companyAddress: org?.address,
      companyCity: org?.city,
      companyCountry: org?.country,
      clientName: selectedClient?.name ?? '—',
      clientTax: selectedClient?.taxId,
      clientAddress: selectedClient?.address,
      clientCity: selectedClient?.city,
      clientCountry: selectedClient?.country,
      currency,
      subtotalHt: totals.ht,
      vatTotal: totals.vat,
      timbreFiscal: settings.applyFiscalStamp ? settings.fiscalStamp : 0,
      totalTtc: totals.ttc,
      paymentTerms: notes.trim() || undefined,
      lines: lines
        .filter((l) => l.description.trim())
        .map((l) => {
          const lineFactor = settings.discountEnabled ? 1 - (l.discountRate || 0) / 100 : 1;
          const globalFactor = settings.discountEnabled ? 1 - settings.discountRate / 100 : 1;
          const calc = calcLine(
            l.quantity || 0,
            l.unitPriceHt || 0,
            settings.applyVat ? l.taxRate || 0 : 0
          );
          return {
            description: l.description,
            qty: l.quantity,
            unitHt: l.unitPriceHt,
            rate: l.taxRate,
            ht: toNumber(calc.lineTotalHt) * lineFactor * globalFactor,
            vat: toNumber(calc.lineVat) * lineFactor * globalFactor,
            ttc: toNumber(calc.lineTotalTtc) * lineFactor * globalFactor,
          };
        }),
    };
  }, [
    selectedClient,
    user?.organization,
    draftNumber,
    issueDate,
    displayValidUntil,
    currency,
    totals,
    settings,
    lines,
    notes,
  ]);

  async function downloadPdf() {
    if (savedDraftId) {
      try {
        await downloadQuotePdfFromApi(savedDraftId, `${draftNumber}.pdf`);
      } catch (e: unknown) {
        toast.push(e instanceof Error ? e.message : tc('error'), 'error');
      }
      return;
    }
    try {
      const blob = await pdf(<QuoteDoc data={previewPdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${draftNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    }
  }

  if (!clients || !products) {
    return <p className="text-sm text-s-muted">{tc('loading')}</p>;
  }

  return (
    <>
      <InvoiceEditorShell
        settings={settings}
        onSettingsChange={setSettings}
        notes={notes}
        onNotesChange={setNotes}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        documentType="quote"
      >
        <div className="space-y-4 pb-10">
          <DocumentEditorActionBar
            title={t('detailTitle')}
            number={previewLoading ? '…' : draftNumber}
            previewLabel={t('preview')}
            saveDraftLabel={t('saveDraft')}
            saveAndFinalizeLabel={t('saveAndFinalize')}
            loadingLabel={tc('loading')}
            deleteAriaLabel={t('deleteDraft')}
            downloadAriaLabel={t('exportPdf')}
            closeAriaLabel={tc('cancel')}
            pending={pending}
            onDelete={() => void deleteDraft()}
            onDownload={() => void downloadPdf()}
            onPreview={() => openPreview()}
            onSaveDraft={() => void saveDraft()}
            onSaveAndFinalize={() => void saveAndFinalize()}
            onClose={() => router.push('/quotes')}
          />

          <section className="rounded-lg border border-s-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-s-muted">
              Devis
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-s-muted">N° Devis</label>
                <Input
                  value={previewLoading ? '…' : draftNumber}
                  readOnly
                  className="bg-slate-50 font-mono text-s-navy"
                />
                <p className="mt-1.5 text-xs text-s-muted">{t('numberPreviewHint')}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-s-muted">{t('date')}</label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-s-muted">
                  {t('validUntil')}
                </label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-s-border bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-s-navy">
              <User className="h-4 w-4 text-s-muted" />
              Client
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
              <Button type="button" variant="ghost" className="border border-s-border bg-white">
                Rechercher
              </Button>
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
              className="mb-4 w-full rounded-lg border border-s-border bg-white px-3 py-2.5 text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— {t('selectClient')} —</option>
              {filteredClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-s-muted">Sujet</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Sujet"
              />
            </div>
          </section>

          <section className="rounded-lg border border-s-border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-s-navy">
                <FileText className="h-4 w-4 text-s-muted" />
                Produits &amp; Services
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
                  <span>Description</span>
                  <span>Quantité</span>
                  <span>Prix unitaire</span>
                  {showLineDiscount ? <span>Remise %</span> : null}
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
                        placeholder="Description"
                        className={lineFieldClass}
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setProductPickerIdx(productPickerIdx === idx ? null : idx)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-brand-blue/40 bg-brand-blue-soft px-2.5 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue-soft/80"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Produits &amp; Services
                        </button>
                        {productPickerIdx === idx && (
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
                        )}
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
                    {showLineDiscount ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={line.discountRate}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? { ...l, discountRate: parseFloat(e.target.value) || 0 }
                                : l
                            )
                          )
                        }
                        className={lineFieldClass}
                      />
                    ) : null}
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

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-medium text-s-muted">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="w-full resize-y rounded-lg border border-s-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
                placeholder="Notes visibles sur le devis…"
              />
              <p className="mt-2 text-xs text-s-muted">
                Conditions de validité, mentions complémentaires…
              </p>
            </div>
            <div className="flex justify-end">
              <TotalsPanel
                ht={totals.ht}
                vat={totals.vat}
                ttc={totals.ttc}
                netPay={totals.netPay}
                currency={currency}
                showVat={settings.applyVat}
                labels={{
                  subtotalHt: t('subtotalHt'),
                  vat: t('vat'),
                  totalTtc: t('totalTtc'),
                  netToPay: t('netToPay'),
                }}
              />
            </div>
          </section>
        </div>
      </InvoiceEditorShell>

      {previewOpen ? (
        <QuotePreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          previewData={previewData}
          payload={previewPayload}
          settings={settings}
          onSettingsChange={setSettings}
          notes={notes}
          onNotesChange={setNotes}
          clientId={clientId}
          quoteId={savedDraftId}
          onQuoteIdChange={setSavedDraftId}
          pdfData={previewPdfData}
        />
      ) : null}
    </>
  );
}
