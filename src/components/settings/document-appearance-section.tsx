'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { apiFetch, uploadOrganizationLogo, deleteOrganizationLogo } from '@/lib/api-client';
import { resolveLogoDisplayUrl, validateLogoFile } from '@/lib/org-logo';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  normalizeHexColor,
  planFromApi,
  PLAN_PDF_LIMITS,
  type PdfTemplateId,
} from '@/lib/pdf-plan-config';
import {
  buildSampleInvoicePreview,
  buildSampleOtherPreview,
  buildSampleQuotePreview,
} from '@/lib/document-preview-sample';
import { catalogToPreviewTemplate } from '@/lib/document-preview-style';
import {
  getEffectiveAppearance,
  googleFontStylesheetHref,
  normalizePdfFontFamily,
  parsePdfAppearanceStore,
  patchAppearanceStore,
  serializePdfAppearanceStore,
  type AppearanceDocScope,
  type AppearanceMode,
  type PdfAppearanceStore,
  type PdfFontFamily,
} from '@/lib/document-appearance';
import { QuotePreviewDocument } from '@/components/invoices/quote-preview-document';
import { InvoicePreviewDocument } from '@/components/invoices/invoice-preview-document';
import { DocumentAppearancePanel } from '@/components/settings/document-appearance-panel';

/** Réduit le contenu A4 proportionnellement à la largeur disponible sur mobile. */
function ScaledPreview({ children, panelOpen }: { children: React.ReactNode; panelOpen: boolean }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    function applyScale() {
      const containerW = wrap!.clientWidth;
      const docW = inner!.offsetWidth;
      if (!docW) return;
      const scale = containerW < docW ? containerW / docW : 1;
      inner!.style.transform = `scale(${scale})`;
      inner!.style.transformOrigin = 'top left';
      wrap!.style.height = `${inner!.offsetHeight * scale}px`;
    }

    applyScale();
    const ro = new ResizeObserver(applyScale);
    ro.observe(wrap!);
    return () => ro.disconnect();
  }, [panelOpen]);

  return (
    <div ref={wrapRef} className="w-full overflow-hidden">
      <div
        ref={innerRef}
        className={cn(
          'w-[210mm] origin-top-left shadow-2xl transition-[box-shadow] duration-300',
          !panelOpen && 'lg:scale-105 xl:scale-[1.12] 2xl:scale-[1.18]'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export type OrgPdfState = {
  subscriptionPlan?: string;
  invoicePdfTemplate: PdfTemplateId;
  quotePdfTemplate: PdfTemplateId;
  otherDocumentPdfTemplate: PdfTemplateId;
  pdfPrimaryColor: string;
  pdfFontFamily?: string;
  pdfAppearance?: unknown;
  invoicePdfAccentColor: string | null;
  quotePdfAccentColor: string | null;
  otherDocumentPdfAccentColor: string | null;
};

export type OrgAppearanceState = OrgPdfState & {
  name: string;
  logoUrl?: string | null;
  taxMatricule?: string | null;
  address?: string | null;
  city?: string | null;
  defaultCurrency?: string;
};

type Props = {
  company: OrgAppearanceState;
  readOnly: boolean;
  onSaved: (org: OrgPdfState & { logoUrl?: string | null }) => void;
  onPanelOpenChange?: (open: boolean) => void;
};

type TemplateMap = Record<AppearanceDocScope, PdfTemplateId>;
type AccentMap = Record<AppearanceDocScope, string>;

function initTemplates(company: OrgAppearanceState): TemplateMap {
  return {
    invoice: company.invoicePdfTemplate,
    quote: company.quotePdfTemplate,
    other: company.otherDocumentPdfTemplate,
  };
}

function initAccents(company: OrgAppearanceState): AccentMap {
  const primary = normalizeHexColor(company.pdfPrimaryColor || '#0f766e');
  return {
    invoice: normalizeHexColor(company.invoicePdfAccentColor ?? primary),
    quote: normalizeHexColor(company.quotePdfAccentColor ?? primary),
    other: normalizeHexColor(company.otherDocumentPdfAccentColor ?? primary),
  };
}

export function DocumentAppearanceSection({
  company,
  readOnly,
  onSaved,
  onPanelOpenChange,
}: Props) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const toast = useToast();
  const { refreshMe } = useAuth();

  const planId = planFromApi(company.subscriptionPlan);
  const limits = PLAN_PDF_LIMITS[planId];
  const isBusiness = planId === 'business';

  const [previewDoc, setPreviewDoc] = useState<AppearanceDocScope>('quote');
  const [editScope, setEditScope] = useState<AppearanceDocScope>('quote');
  const [appearanceStore, setAppearanceStore] = useState<PdfAppearanceStore>(() =>
    parsePdfAppearanceStore(company.pdfAppearance)
  );
  const [templates, setTemplates] = useState<TemplateMap>(() => initTemplates(company));
  const [accents, setAccents] = useState<AccentMap>(() => initAccents(company));
  const [fontFamily, setFontFamily] = useState<PdfFontFamily>(() =>
    normalizePdfFontFamily(company.pdfFontFamily)
  );
  const [draftLogoUrl, setDraftLogoUrl] = useState<string | null>(company.logoUrl ?? null);
  const [logoCacheBust, setLogoCacheBust] = useState<number | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    onPanelOpenChange?.(panelOpen);
  }, [panelOpen, onPanelOpenChange]);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const resetDraft = useCallback(() => {
    setAppearanceStore(parsePdfAppearanceStore(company.pdfAppearance));
    setTemplates(initTemplates(company));
    setAccents(initAccents(company));
    setFontFamily(normalizePdfFontFamily(company.pdfFontFamily));
    setDraftLogoUrl(company.logoUrl ?? null);
    setDirty(false);
  }, [company]);

  useEffect(() => {
    resetDraft();
  }, [resetDraft]);

  useEffect(() => {
    const id = 'doc-appearance-preview-font';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = googleFontStylesheetHref(fontFamily);
  }, [fontFamily]);

  const previewAppearance = useMemo(
    () => getEffectiveAppearance(appearanceStore, previewDoc),
    [appearanceStore, previewDoc]
  );

  const editAppearance = useMemo(
    () => getEffectiveAppearance(appearanceStore, editScope),
    [appearanceStore, editScope]
  );

  const previewAccent = useMemo(() => {
    if (!limits.allowAccentColor) return '#0f766e';
    if (isBusiness && appearanceStore.mode === 'per_document') {
      return accents[previewDoc];
    }
    return accents.invoice;
  }, [limits.allowAccentColor, isBusiness, appearanceStore.mode, accents, previewDoc]);

  const editAccent = useMemo(() => {
    if (!limits.allowAccentColor) return '#0f766e';
    if (isBusiness && appearanceStore.mode === 'per_document') {
      return accents[editScope];
    }
    return accents.invoice;
  }, [limits.allowAccentColor, isBusiness, appearanceStore.mode, accents, editScope]);

  const previewTemplate = useMemo(() => {
    const tpl =
      isBusiness && appearanceStore.mode === 'per_document'
        ? templates[previewDoc]
        : templates.invoice;
    return catalogToPreviewTemplate(tpl);
  }, [isBusiness, appearanceStore.mode, templates, previewDoc]);

  const orgPreview = useMemo(
    () => ({
      name: company.name,
      taxMatricule: company.taxMatricule,
      address: company.address,
      city: company.city,
      defaultCurrency: company.defaultCurrency,
    }),
    [company.name, company.taxMatricule, company.address, company.city, company.defaultCurrency]
  );

  const quotePreviewData = useMemo(() => buildSampleQuotePreview(orgPreview), [orgPreview]);
  const invoicePreviewData = useMemo(() => buildSampleInvoicePreview(orgPreview), [orgPreview]);
  const otherPreviewData = useMemo(() => buildSampleOtherPreview(orgPreview), [orgPreview]);

  const previewStyle = {
    accentColor: previewAccent,
    logoUrl: resolveLogoDisplayUrl(draftLogoUrl, logoCacheBust ?? undefined),
    template: previewTemplate,
    fontFamily,
    appearance: previewAppearance,
  };

  async function onLogoFileSelected(file: File | null) {
    if (!file || readOnly) return;
    const validationError = validateLogoFile(file);
    if (validationError) {
      toast.push(validationError, 'error');
      return;
    }
    setLogoUploading(true);
    try {
      const { logoUrl } = await uploadOrganizationLogo(file);
      setDraftLogoUrl(logoUrl);
      setLogoCacheBust(Date.now());
      onSaved({ ...company, logoUrl: logoUrl ?? null });
      await refreshMe();
      toast.push(t('appearanceSaved'));
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : t('appearanceSaveError'), 'error');
    } finally {
      setLogoUploading(false);
    }
  }

  async function onLogoRemove() {
    if (readOnly) return;
    setLogoUploading(true);
    try {
      await deleteOrganizationLogo();
      setDraftLogoUrl(null);
      setLogoCacheBust(Date.now());
      onSaved({ ...company, logoUrl: null });
      await refreshMe();
      toast.push(t('appearanceSaved'));
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : t('appearanceSaveError'), 'error');
    } finally {
      setLogoUploading(false);
    }
  }

  function onPreviewChange(scope: AppearanceDocScope) {
    setPreviewDoc(scope);
    if (isBusiness && appearanceStore.mode === 'per_document') {
      setEditScope(scope);
    }
  }

  function onModeChange(mode: AppearanceMode) {
    if (readOnly || !isBusiness) return;
    setAppearanceStore((prev) => ({ ...prev, mode }));
    if (mode === 'unified') {
      const master = accents[editScope];
      setAccents({ invoice: master, quote: master, other: master });
    }
    setDirty(true);
  }

  function onEditScopeChange(scope: AppearanceDocScope) {
    setEditScope(scope);
  }

  function patchAppearance(patch: Parameters<typeof patchAppearanceStore>[2]) {
    if (readOnly) return;
    setAppearanceStore((prev) => patchAppearanceStore(prev, editScope, patch, isBusiness));
    setDirty(true);
  }

  function onAccentChange(value: string) {
    if (readOnly || !limits.allowAccentColor) return;
    const color = normalizeHexColor(value, editAccent);
    if (isBusiness && appearanceStore.mode === 'per_document') {
      setAccents((prev) => ({ ...prev, [editScope]: color }));
    } else {
      setAccents({
        invoice: color,
        quote: color,
        other: color,
      });
    }
    setDirty(true);
  }

  function onFontChange(font: PdfFontFamily) {
    if (readOnly) return;
    setFontFamily(font);
    setDirty(true);
  }

  async function onSave() {
    if (readOnly) {
      toast.push(t('readOnlyAdmin'), 'error');
      return;
    }
    if (!dirty) return;

    setSaving(true);
    try {
      const unifiedColor = accents.invoice;
      const body: Record<string, unknown> = {
        pdfPrimaryColor: normalizeHexColor(unifiedColor),
        pdfFontFamily: fontFamily,
        pdfAppearance: serializePdfAppearanceStore(appearanceStore),
        invoicePdfTemplate: templates.invoice,
        quotePdfTemplate: templates.quote,
        otherDocumentPdfTemplate: templates.other,
      };

      if (isBusiness && appearanceStore.mode === 'per_document') {
        body.invoicePdfAccentColor = normalizeHexColor(accents.invoice);
        body.quotePdfAccentColor = normalizeHexColor(accents.quote);
        body.otherDocumentPdfAccentColor = normalizeHexColor(accents.other);
      } else {
        body.invoicePdfAccentColor = null;
        body.quotePdfAccentColor = null;
        body.otherDocumentPdfAccentColor = null;
      }

      const updated = await apiFetch<
        OrgPdfState & { subscriptionPlan: string; logoUrl: string | null; pdfAppearance?: unknown }
      >('/organizations', {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      onSaved({ ...updated, logoUrl: updated.logoUrl ?? draftLogoUrl });
      setDirty(false);
      toast.push(t('appearanceSaved'));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erreur';
      toast.push(message || t('appearanceSaveError'), 'error');
    } finally {
      setSaving(false);
    }
  }

  const panelLabels = {
    cancel: t('appearanceCancel'),
    save: tc('save'),
    logoTitle: t('appearanceLogoTitle'),
    logoSize: t('appearanceLogoSize'),
    logoPositionLeft: t('appearanceLogoPositionLeft'),
    logoPositionTop: t('appearanceLogoPositionTop'),
    logoPositionHeader: t('appearanceLogoPositionHeader'),
    logoCenter: t('appearanceLogoCenter'),
    hideCompanyName: t('appearanceHideCompanyName'),
    hideSlogan: t('appearanceHideSlogan'),
    hideAddress: t('appearanceHideAddress'),
    hidePhone: t('appearanceHidePhone'),
    hideEmail: t('appearanceHideEmail'),
    hideWebsite: t('appearanceHideWebsite'),
    hideSiret: t('appearanceHideSiret'),
    hideVat: t('appearanceHideVat'),
    colorTitle: t('appearanceColor'),
    colorCustom: t('appearanceColorCustom'),
    colorSuggestions: t('appearanceColorSuggestions'),
    colorLocked: t('appearanceColorLocked'),
    fontTitle: t('appearanceFont'),
    changeLogo: t('changeLogo'),
    closePanel: t('appearanceClosePanel'),
    openPanel: t('appearanceOpenPanel'),
    modeUnified: t('appearanceModeUnified'),
    modePerDoc: t('appearanceModePerDoc'),
    editScopeLabel: t('appearanceEditScope'),
    scopeInvoice: t('template_invoice'),
    scopeQuote: t('template_quote'),
    scopeOther: t('template_other'),
    perDocHint: t('appearancePerDocHint'),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
      <div
        className={cn(
          'grid min-h-0 flex-1 transition-[grid-template-columns] duration-300 ease-out',
          panelOpen ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'
        )}
      >
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-slate-100">
          <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <label className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{t('appearancePreviewLabel')}</span>
              <div className="relative">
                <select
                  value={previewDoc}
                  onChange={(e) => onPreviewChange(e.target.value as AppearanceDocScope)}
                  className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="quote">{t('template_quote')}</option>
                  <option value="invoice">{t('template_invoice')}</option>
                  <option value="other">{t('template_other')}</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </label>
            {!panelOpen ? (
              <button
                type="button"
                onClick={openPanel}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <SlidersHorizontal className="h-4 w-4 text-brand-blue" />
                {t('appearanceOpenPanel')}
              </button>
            ) : null}
          </div>

          <div
            className={cn(
              'flex min-h-0 flex-1 items-start justify-center overflow-y-auto transition-all duration-300',
              panelOpen ? 'p-2 sm:p-5 lg:p-8' : 'p-2 sm:p-6 lg:p-12'
            )}
          >
            <ScaledPreview panelOpen={panelOpen}>
              {previewDoc === 'quote' ? (
                <QuotePreviewDocument data={quotePreviewData} {...previewStyle} />
              ) : (
                <InvoicePreviewDocument
                  data={previewDoc === 'other' ? otherPreviewData : invoicePreviewData}
                  {...previewStyle}
                />
              )}
            </ScaledPreview>
          </div>
        </div>

        {panelOpen ? (
          <DocumentAppearancePanel
            logoUrl={resolveLogoDisplayUrl(draftLogoUrl, logoCacheBust ?? undefined)}
            accentColor={editAccent}
            fontFamily={fontFamily}
            appearance={editAppearance}
            colorLocked={!limits.allowAccentColor}
            readOnly={readOnly || logoUploading}
            dirty={dirty}
            saving={saving}
            isBusiness={isBusiness}
            appearanceMode={appearanceStore.mode}
            editScope={editScope}
            onModeChange={onModeChange}
            onEditScopeChange={onEditScopeChange}
            onClose={closePanel}
            onLogoChange={(file) => void onLogoFileSelected(file)}
            onLogoRemove={() => void onLogoRemove()}
            onAppearanceChange={patchAppearance}
            onAccentChange={onAccentChange}
            onFontChange={onFontChange}
            onCancel={resetDraft}
            onSave={() => void onSave()}
            labels={panelLabels}
          />
        ) : null}
      </div>
    </div>
  );
}

/** @deprecated Alias — préférer DocumentAppearanceSection */
export const PdfTemplatesSection = DocumentAppearanceSection;
