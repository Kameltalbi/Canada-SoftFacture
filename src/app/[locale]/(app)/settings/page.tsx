'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { apiFetch, uploadOrganizationLogo, deleteOrganizationLogo } from '@/lib/api-client';
import { resolveLogoDisplayUrl, validateLogoFile } from '@/lib/org-logo';
import { useAuth } from '@/contexts/auth-context';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  Building2,
  Coins,
  Percent,
  Hash,
  PanelBottom,
  Tags,
  Users,
  Shield,
  Warehouse,
} from 'lucide-react';
import { CategoriesSection } from '@/components/settings/categories-section';
import { cn } from '@/lib/utils';
import { FEATURES } from '@/lib/feature-flags';
import { NUMBER_FORMAT_PRESETS, presetKeyFromFormat } from '@/lib/document-numbering';
import { NumberingSection, type NumberingForm } from '@/components/settings/numbering-section';
import { PdfTemplatesSection } from '@/components/settings/pdf-templates-section';
import { UsersSection } from '@/components/settings/users-section';
import { SettingsLayout } from '@/components/settings/settings-layout';
import { SettingsSectionHeader } from '@/components/settings/settings-section-header';
import { ComingSoonSection } from '@/components/settings/coming-soon-section';
import { Switch } from '@/components/ui/switch';
import {
  normalizeSettingsSection,
  type SettingsSectionId,
} from '@/components/settings/settings-config';

const PDF_DOC_TEMPLATES = ['CLASSIC', 'MODERN', 'MINIMAL', 'MONO', 'BLUE_PRO'] as const;
type OrgPdfTemplate = (typeof PDF_DOC_TEMPLATES)[number];

type Org = {
  id: string;
  name: string;
  logoUrl: string | null;
  taxMatricule: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  defaultCurrency: string;
  defaultVatRate: unknown;
  invoicePrefix: string;
  quotePrefix: string;
  depositPrefix: string;
  invoiceNumberFormat: string;
  quoteNumberFormat: string;
  depositNumberFormat: string;
  invoiceResetYearly: boolean;
  quoteResetYearly: boolean;
  depositResetYearly: boolean;
  invoiceSequence: number;
  quoteSequence: number;
  depositSequence: number;
  lastInvoiceYear: number;
  lastQuoteYear: number;
  lastDepositYear: number;
  subscriptionPlan?: string;
  invoicePdfTemplate: OrgPdfTemplate;
  quotePdfTemplate: OrgPdfTemplate;
  otherDocumentPdfTemplate: OrgPdfTemplate;
  pdfPrimaryColor: string;
  pdfFontFamily?: string;
  pdfAppearance?: unknown;
  invoicePdfAccentColor: string | null;
  quotePdfAccentColor: string | null;
  otherDocumentPdfAccentColor: string | null;
  documentFooterText: string | null;
  vatOnDebitsEnabled?: boolean;
  isMicroEntrepreneur?: boolean;
  stockManagementEnabled?: boolean;
  paProvider?: 'NONE' | 'MOCK';
  paAccountRef?: string | null;
  paConnectedAt?: string | null;
  /** Mentions légales structurées */
  legalForm?: string | null;
  shareCapital?: string | null;
  rcsCity?: string | null;
  legalAddress?: string | null;
  legalPostalCode?: string | null;
  legalCity?: string | null;
};

type CustomTax = {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;

function SettingsPageContent() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user, refreshMe } = useAuth();
  const activeSection = normalizeSettingsSection(searchParams.get('s'));

  function setActiveSection(id: SettingsSectionId) {
    router.replace(`/settings?s=${id}`);
  }
  const [company, setCompany] = useState<Org | null>(null);
  const [logoCacheBust, setLogoCacheBust] = useState<number | null>(null);
  const [customTaxes, setCustomTaxes] = useState<CustomTax[]>([]);
  const [newTax, setNewTax] = useState({
    name: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
  });
  const [form, setForm] = useState({
    name: '',
    logoUrl: '',
    taxMatricule: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'FR',
    defaultCurrency: 'EUR',
    defaultVatRate: '20',
    invoicePrefix: 'FAC',
    quotePrefix: 'DEV',
    documentFooterText: '',
    vatOnDebitsEnabled: false,
    isMicroEntrepreneur: false,
    stockManagementEnabled: false,
    legalForm: '',
    shareCapital: '',
    rcsCity: '',
    legalAddress: '',
    legalPostalCode: '',
    legalCity: '',
  });
  const [numberingForm, setNumberingForm] = useState<NumberingForm>({
    invoicePrefix: 'FAC',
    quotePrefix: 'DEV',
    depositPrefix: 'ACO',
    invoiceNumberFormat: NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4,
    quoteNumberFormat: NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4,
    depositNumberFormat: NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4,
    invoiceResetYearly: true,
    quoteResetYearly: true,
    depositResetYearly: true,
    invoiceFormatPreset: 'PREFIX_YEAR_SEQ4',
    quoteFormatPreset: 'PREFIX_YEAR_SEQ4',
    depositFormatPreset: 'PREFIX_YEAR_SEQ4',
  });
  const [appearancePanelOpen, setAppearancePanelOpen] = useState(true);

  const load = useCallback(async () => {
    const org = await apiFetch<Org>('/organizations');
    setCompany(org);
    setForm({
      name: org.name,
      logoUrl: org.logoUrl ?? '',
      taxMatricule: org.taxMatricule ?? '',
      address: org.address ?? '',
      city: org.city ?? '',
      postalCode: org.postalCode ?? '',
      country: org.country,
      defaultCurrency: org.defaultCurrency,
      defaultVatRate: String(Number(org.defaultVatRate)),
      invoicePrefix: org.invoicePrefix ?? 'FAC',
      quotePrefix: org.quotePrefix ?? 'DEV',
      documentFooterText: org.documentFooterText ?? '',
      vatOnDebitsEnabled: org.vatOnDebitsEnabled ?? false,
      isMicroEntrepreneur: org.isMicroEntrepreneur ?? false,
      stockManagementEnabled: org.stockManagementEnabled ?? false,
      legalForm: org.legalForm ?? '',
      shareCapital: org.shareCapital ?? '',
      rcsCity: org.rcsCity ?? '',
      legalAddress: org.legalAddress ?? '',
      legalPostalCode: org.legalPostalCode ?? '',
      legalCity: org.legalCity ?? '',
    });
    setNumberingForm({
      invoicePrefix: org.invoicePrefix ?? 'FAC',
      quotePrefix: org.quotePrefix ?? 'DEV',
      depositPrefix: org.depositPrefix ?? 'ACO',
      invoiceNumberFormat: org.invoiceNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4,
      quoteNumberFormat: org.quoteNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4,
      depositNumberFormat: org.depositNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4,
      invoiceResetYearly: org.invoiceResetYearly ?? true,
      quoteResetYearly: org.quoteResetYearly ?? true,
      depositResetYearly: org.depositResetYearly ?? true,
      invoiceFormatPreset: presetKeyFromFormat(
        org.invoiceNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4
      ),
      quoteFormatPreset: presetKeyFromFormat(
        org.quoteNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4
      ),
      depositFormatPreset: presetKeyFromFormat(
        org.depositNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4
      ),
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
  }, [token, load, toast]);

  useEffect(() => {
    if (!token || activeSection !== 'taxes') return;
    void apiFetch<CustomTax[]>('/organizations/custom-taxes')
      .then(setCustomTaxes)
      .catch(() => setCustomTaxes([]));
  }, [token, activeSection]);

  async function onCreateTax() {
    try {
      const tax = await apiFetch<CustomTax>('/organizations/custom-taxes', {
        method: 'POST',
        body: JSON.stringify({
          name: newTax.name,
          type: newTax.type,
          value: parseFloat(newTax.value),
        }),
      });
      setCustomTaxes((prev) => [...prev, tax]);
      setNewTax({ name: '', type: 'PERCENTAGE', value: '' });
      toast.push(t('taxCreated') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onDeleteTax(id: string) {
    try {
      await apiFetch(`/organizations/custom-taxes/${id}`, { method: 'DELETE' });
      setCustomTaxes((prev) => prev.filter((t) => t.id !== id));
      toast.push(t('taxDeleted') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onSaveFooter() {
    try {
      const updated = await apiFetch<Org>('/organizations', {
        method: 'PATCH',
        body: JSON.stringify({
          documentFooterText: form.documentFooterText.trim()
            ? form.documentFooterText.trim()
            : null,
          isMicroEntrepreneur: form.isMicroEntrepreneur,
          legalForm: form.legalForm.trim() || null,
          shareCapital: form.shareCapital.trim() || null,
          rcsCity: form.rcsCity.trim() || null,
          legalAddress: form.legalAddress.trim() || null,
          legalPostalCode: form.legalPostalCode.trim() || null,
          legalCity: form.legalCity.trim() || null,
        }),
      });
      setCompany(updated);
      toast.push(tc('save') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onSaveOrg() {
    try {
      const updated = await apiFetch<Org>('/organizations', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          taxMatricule: form.taxMatricule || null,
          address: form.address || null,
          city: form.city || null,
          postalCode: form.postalCode || null,
          country: form.country,
        }),
      });
      setCompany(updated);
      toast.push(tc('save') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onSaveCurrency() {
    try {
      const updated = await apiFetch<Org>('/organizations', {
        method: 'PATCH',
        body: JSON.stringify({ defaultCurrency: form.defaultCurrency }),
      });
      setCompany(updated);
      toast.push(tc('save') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onSaveVat() {
    try {
      const updated = await apiFetch<Org>('/organizations', {
        method: 'PATCH',
        body: JSON.stringify({
          defaultVatRate: parseFloat(form.defaultVatRate) || 0,
          vatOnDebitsEnabled: form.vatOnDebitsEnabled,
        }),
      });
      setCompany(updated);
      toast.push(tc('save') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onSaveStock() {
    try {
      const updated = await apiFetch<Org>('/organizations', {
        method: 'PATCH',
        body: JSON.stringify({
          stockManagementEnabled: form.stockManagementEnabled,
        }),
      });
      setCompany(updated);
      setForm((f) => ({
        ...f,
        stockManagementEnabled: updated.stockManagementEnabled ?? false,
      }));
      await refreshMe();
      toast.push(tc('save') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onSaveNumbering() {
    try {
      const updated = await apiFetch<Org>('/organizations', {
        method: 'PATCH',
        body: JSON.stringify({
          invoicePrefix: numberingForm.invoicePrefix.trim() || 'FAC',
          quotePrefix: numberingForm.quotePrefix.trim() || 'DEV',
          depositPrefix: numberingForm.depositPrefix.trim() || 'ACO',
          invoiceNumberFormat: numberingForm.invoiceNumberFormat.trim(),
          quoteNumberFormat: numberingForm.quoteNumberFormat.trim(),
          depositNumberFormat: numberingForm.depositNumberFormat.trim(),
          invoiceResetYearly: numberingForm.invoiceResetYearly,
          quoteResetYearly: numberingForm.quoteResetYearly,
          depositResetYearly: numberingForm.depositResetYearly,
        }),
      });
      setCompany(updated);
      setNumberingForm({
        invoicePrefix: updated.invoicePrefix ?? 'FAC',
        quotePrefix: updated.quotePrefix ?? 'DEV',
        depositPrefix: updated.depositPrefix ?? 'ACO',
        invoiceNumberFormat: updated.invoiceNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4,
        quoteNumberFormat: updated.quoteNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4,
        depositNumberFormat: updated.depositNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4,
        invoiceResetYearly: updated.invoiceResetYearly ?? true,
        quoteResetYearly: updated.quoteResetYearly ?? true,
        depositResetYearly: updated.depositResetYearly ?? true,
        invoiceFormatPreset: presetKeyFromFormat(
          updated.invoiceNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4
        ),
        quoteFormatPreset: presetKeyFromFormat(
          updated.quoteNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4
        ),
        depositFormatPreset: presetKeyFromFormat(
          updated.depositNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4
        ),
      });
      toast.push(t('numberingSave') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onLogoChange(file: File | null) {
    if (!file) return;
    const validationError = validateLogoFile(file);
    if (validationError) {
      toast.push(validationError, 'error');
      return;
    }
    try {
      const { logoUrl } = await uploadOrganizationLogo(file);
      setForm((f) => ({ ...f, logoUrl: logoUrl ?? '' }));
      setCompany((c) => (c ? { ...c, logoUrl } : c));
      setLogoCacheBust(Date.now());
      await refreshMe();
      toast.push(tc('save') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onLogoRemove() {
    try {
      await deleteOrganizationLogo();
      setForm((f) => ({ ...f, logoUrl: '' }));
      setCompany((c) => (c ? { ...c, logoUrl: null } : c));
      setLogoCacheBust(Date.now());
      await refreshMe();
      toast.push(tc('save') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  const logoDisplayUrl = resolveLogoDisplayUrl(form.logoUrl || null, logoCacheBust ?? undefined);

  if (!company) {
    return (
      <SettingsLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        <p className="text-sm text-s-muted">{tc('loading')}</p>
      </SettingsLayout>
    );
  }

  const readOnly = user?.role !== 'ADMIN';
  const isAppearanceEditor = activeSection === 'templates';

  return (
    <SettingsLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      variant={isAppearanceEditor ? 'fullscreen' : 'default'}
      sidebarCollapsed={isAppearanceEditor && appearancePanelOpen}
    >
      {readOnly && !isAppearanceEditor && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
          {t('readOnlyAdmin')}
        </p>
      )}

      {readOnly && isAppearanceEditor && (
        <p className="shrink-0 border-b border-amber-200 bg-amber-50 px-6 py-2 text-xs text-amber-700">
          {t('readOnlyAdmin')}
        </p>
      )}

      {activeSection === 'organisation' && (
        <Card className="rounded-3xl border-s-border/80 bg-white p-6 shadow-sm md:p-8">
          <SettingsSectionHeader
            icon={Building2}
            title={t('orgInfoTitle')}
            description={t('orgInfoDesc')}
          />
          <div className="space-y-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-s-muted">
                {t('companyLogo')}
              </label>
              <div className="flex flex-col gap-5 rounded-2xl border border-s-border bg-slate-50/80 p-5 sm:flex-row sm:items-center">
                <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-s-border bg-white p-2 shadow-sm">
                  {logoDisplayUrl ? (
                    <div
                      aria-label={t('companyLogo')}
                      className="h-full w-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${logoDisplayUrl})` }}
                    />
                  ) : (
                    <span className="px-2 text-center text-[10px] text-s-muted">{t('noLogo')}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex">
                      <span
                        className={cn(
                          'inline-flex cursor-pointer items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark',
                          readOnly && 'pointer-events-none opacity-50'
                        )}
                      >
                        {t('changeLogo')}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        disabled={readOnly}
                        className="hidden"
                        onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {logoDisplayUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={readOnly}
                        onClick={() => void onLogoRemove()}
                      >
                        {t('removeLogo')}
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-s-muted">{t('companyLogoHint')}</p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-s-muted">
                  {t('companyName')}
                </label>
                <Input
                  value={form.name}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-s-muted">
                  {t('country')}
                </label>
                <Input
                  value={form.country}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="FR"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-s-muted">
                {t('addressFull')}
              </label>
              <textarea
                value={form.address}
                disabled={readOnly}
                rows={3}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="w-full rounded-xl border border-s-border bg-white px-4 py-2.5 text-sm text-s-navy shadow-sm focus:border-s-accent focus:outline-none focus:ring-2 focus:ring-s-accent/20"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-s-muted">{t('city')}</label>
                <Input
                  value={form.city}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-s-muted">
                  {t('postalCode')}
                </label>
                <Input
                  value={form.postalCode}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
                />
              </div>
            </div>
            <div className="rounded-2xl border border-s-border bg-slate-50/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-s-navy">{t('taxIdsTitle')}</h3>
              <div>
                <label className="mb-1 block text-xs font-medium text-s-muted">
                  {t('taxMatricule')}
                </label>
                <Input
                  value={form.taxMatricule}
                  disabled={readOnly}
                  onChange={(e) => setForm((f) => ({ ...f, taxMatricule: e.target.value }))}
                  placeholder="123 456 789 00012"
                />
              </div>
            </div>
            <div className="flex justify-end border-t border-s-border/70 pt-5">
              <Button
                type="button"
                variant="primary"
                disabled={readOnly}
                onClick={() => void onSaveOrg()}
              >
                {tc('save')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeSection === 'devises' && (
        <Card className="border-s-border/80 shadow-sm">
          <SettingsSectionHeader
            icon={Coins}
            title={t('nav_devises')}
            description={t('devisesDesc')}
          />
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-s-muted">
                {t('defaultCurrency')}
              </label>
              <select
                value={form.defaultCurrency}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value }))}
                className="w-full max-w-xs rounded-lg border border-s-border px-3 py-2 text-sm text-s-navy"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="primary"
              disabled={readOnly}
              onClick={() => void onSaveCurrency()}
            >
              {tc('save')}
            </Button>
          </div>
        </Card>
      )}

      {activeSection === 'numerotation' && (
        <Card className="border-s-border/80 shadow-sm">
          <SettingsSectionHeader
            icon={Hash}
            title={t('nav_numerotation')}
            description={t('numberingIntro')}
          />
          <NumberingSection
            form={numberingForm}
            company={company}
            readOnly={readOnly}
            onChange={(patch) => setNumberingForm((f) => ({ ...f, ...patch }))}
            onSave={() => void onSaveNumbering()}
          />
        </Card>
      )}

      {activeSection === 'templates' && company && (
        <PdfTemplatesSection
          company={company}
          readOnly={readOnly}
          onPanelOpenChange={setAppearancePanelOpen}
          onSaved={(org) => {
            setCompany((c) => (c ? { ...c, ...org, logoUrl: org.logoUrl ?? c.logoUrl } : c));
            void refreshMe();
          }}
        />
      )}

      {activeSection === 'pied' && (
        <Card className="border-s-border/80 shadow-sm">
          <SettingsSectionHeader
            icon={PanelBottom}
            title={t('nav_pied')}
            description={t('footer_hint')}
          />
          <div className="space-y-6">
            {/* Toggle Micro-entrepreneur */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-s-border bg-slate-50 p-4">
              <div>
                <p className="text-sm font-medium text-s-navy">
                  {t('microEntrepreneur_title') || 'Micro-entrepreneur / Franchise TVA'}
                </p>
                <p className="mt-1 text-xs text-s-muted">
                  {t('microEntrepreneur_hint') ||
                    'Active la mention automatique art. 293 B du CGI (TVA non applicable)'}
                </p>
              </div>
              <Switch
                checked={form.isMicroEntrepreneur}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isMicroEntrepreneur: checked }))
                }
              />
            </div>

            {/* Mentions légales structurées */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-s-navy">
                {t('legalMentions_title') || 'Mentions légales structurées'}
              </p>
              <p className="text-xs text-s-muted">
                {t('legalMentions_hint') ||
                  'Ces informations permettent de générer automatiquement le pied de page conforme aux obligations légales.'}
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-s-muted">
                    {t('legalForm') || 'Forme juridique'}
                  </label>
                  <Input
                    value={form.legalForm}
                    disabled={readOnly}
                    placeholder="SARL, SAS, EI..."
                    onChange={(e) => setForm((f) => ({ ...f, legalForm: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-s-muted">
                    {t('shareCapital') || 'Capital social'}
                  </label>
                  <Input
                    value={form.shareCapital}
                    disabled={readOnly}
                    placeholder="10 000 €"
                    onChange={(e) => setForm((f) => ({ ...f, shareCapital: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-s-muted">
                    {t('rcsCity') || 'RCS (ville)'}
                  </label>
                  <Input
                    value={form.rcsCity}
                    disabled={readOnly}
                    placeholder="Paris"
                    onChange={(e) => setForm((f) => ({ ...f, rcsCity: e.target.value }))}
                  />
                </div>
              </div>

              <p className="text-xs font-medium text-s-muted pt-2">
                {t('legalAddress_title') || "Siège social (si différent de l'adresse principale)"}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input
                  value={form.legalAddress}
                  disabled={readOnly}
                  placeholder="10 rue de la Paix"
                  onChange={(e) => setForm((f) => ({ ...f, legalAddress: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Input
                    value={form.legalPostalCode}
                    disabled={readOnly}
                    placeholder="75001"
                    onChange={(e) => setForm((f) => ({ ...f, legalPostalCode: e.target.value }))}
                  />
                  <Input
                    value={form.legalCity}
                    disabled={readOnly}
                    placeholder="Paris"
                    onChange={(e) => setForm((f) => ({ ...f, legalCity: e.target.value }))}
                  />
                </div>
              </div>

              {/* Bouton Générer */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={readOnly}
                  onClick={async () => {
                    try {
                      const res = await apiFetch<{ suggestion: string; message: string | null }>(
                        '/organizations/legal-footer-suggestion'
                      );
                      if (res.suggestion) {
                        setForm((f) => ({ ...f, documentFooterText: res.suggestion }));
                        toast.push(t('footerGenerated') || 'Pied de page généré ✓');
                      } else if (res.message) {
                        toast.push(res.message, 'success');
                      }
                    } catch (e: unknown) {
                      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
                    }
                  }}
                >
                  {t('footerGenerate') || 'Générer le pied de page'}
                </Button>
              </div>
            </div>

            {/* Footer personnalisé */}
            <div className="space-y-2 pt-4 border-t border-s-border">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-s-muted">
                  {t('footer_title')}
                </label>
                <span className="text-[10px] text-s-muted italic">
                  {t('footer_customHint') || 'Prioritaire sur la génération automatique'}
                </span>
              </div>
              <textarea
                value={form.documentFooterText}
                disabled={readOnly}
                rows={4}
                onChange={(e) => setForm((f) => ({ ...f, documentFooterText: e.target.value }))}
                placeholder="Ex. SARL au capital de 10 000 € — RCS Paris 123 456 789 — TVA FR12345678900 — Siège : 10 rue de la Paix, 75001 Paris"
                className="w-full max-w-xl rounded-xl border border-s-border bg-white px-4 py-2.5 text-sm text-s-navy shadow-sm transition placeholder:text-s-muted focus:border-s-accent focus:outline-none focus:ring-2 focus:ring-s-accent/20"
              />
              <p className="text-[10px] text-s-muted">{t('footer_hint')}</p>
            </div>

            <Button
              type="button"
              variant="primary"
              disabled={readOnly}
              onClick={() => void onSaveFooter()}
            >
              {t('footerSave')}
            </Button>
          </div>
        </Card>
      )}

      {activeSection === 'exercice' && <ComingSoonSection title={t('nav_exercice')} />}

      {activeSection === 'taxes' && (
        <Card className="border-s-border/80 shadow-sm">
          <SettingsSectionHeader
            icon={Percent}
            title={t('nav_taxes')}
            description={t('taxRatesHint')}
          />
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-s-muted">
                {t('defaultVatRate')}
              </label>
              <Input
                type="number"
                value={form.defaultVatRate}
                disabled={readOnly}
                onChange={(e) => setForm((f) => ({ ...f, defaultVatRate: e.target.value }))}
              />
              <p className="mt-1 text-[10px] text-s-muted">{t('defaultVatRateHint')}</p>
            </div>
            {FEATURES.einvoiceUi ? (
              <div className="flex items-start justify-between gap-4 rounded-lg border border-s-border bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium text-s-navy">{t('vatOnDebitsEnabled')}</p>
                  <p className="mt-1 text-xs text-s-muted">{t('vatOnDebitsEnabledHint')}</p>
                </div>
                <Switch
                  checked={form.vatOnDebitsEnabled}
                  disabled={readOnly}
                  onCheckedChange={(checked) =>
                    setForm((f) => ({ ...f, vatOnDebitsEnabled: checked }))
                  }
                />
              </div>
            ) : null}
            <div className="rounded-lg border border-s-border bg-slate-50 p-4">
              <h3 className="mb-2 text-sm font-medium text-s-navy">{t('taxRatesTitle')}</h3>
              <div className="space-y-2 text-sm text-s-muted">
                <div className="flex justify-between">
                  <span>TVA standard</span>
                  <span className="font-medium text-s-navy">20%</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA intermédiaire</span>
                  <span className="font-medium text-s-navy">10%</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA réduite</span>
                  <span className="font-medium text-s-navy">5,5%</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA super-réduite</span>
                  <span className="font-medium text-s-navy">2,1%</span>
                </div>
                <div className="flex justify-between">
                  <span>Exonéré</span>
                  <span className="font-medium text-s-navy">0%</span>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-s-muted">{t('taxRatesHint')}</p>
            </div>

            {/* Custom taxes */}
            <div className="rounded-lg border border-s-border bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-medium text-s-navy">{t('customTaxesTitle')}</h3>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-s-muted">
                    {t('taxName')}
                  </label>
                  <Input
                    value={newTax.name}
                    disabled={readOnly}
                    onChange={(e) => setNewTax((t) => ({ ...t, name: e.target.value }))}
                    placeholder={t('taxNamePlaceholder')}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-s-muted">
                    {t('taxType')}
                  </label>
                  <select
                    value={newTax.type}
                    disabled={readOnly}
                    onChange={(e) =>
                      setNewTax((t) => ({
                        ...t,
                        type: e.target.value as 'PERCENTAGE' | 'FIXED',
                      }))
                    }
                    className="w-full rounded-lg border border-s-border px-3 py-2 text-sm text-s-navy"
                  >
                    <option value="PERCENTAGE">{t('taxTypePercentage')}</option>
                    <option value="FIXED">{t('taxTypeFixed')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-s-muted">
                    {t('taxValue')}
                  </label>
                  <Input
                    type="number"
                    value={newTax.value}
                    disabled={readOnly}
                    onChange={(e) => setNewTax((t) => ({ ...t, value: e.target.value }))}
                    placeholder={newTax.type === 'PERCENTAGE' ? '20' : '5.00'}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={readOnly || !newTax.name || !newTax.value}
                onClick={() => void onCreateTax()}
              >
                + {t('addCustomTax')}
              </Button>
            </div>

            {/* Custom taxes list */}
            {customTaxes.length > 0 && (
              <div className="rounded-lg border border-s-border bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-medium text-s-navy">{t('customTaxesList')}</h3>
                <div className="space-y-2">
                  {customTaxes.map((tax) => (
                    <div
                      key={tax.id}
                      className="flex items-center justify-between rounded-lg border border-s-border bg-white px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-s-navy">{tax.name}</span>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            tax.type === 'PERCENTAGE'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-purple-50 text-purple-700'
                          )}
                        >
                          {tax.type === 'PERCENTAGE' ? t('taxTypePercentage') : t('taxTypeFixed')}
                        </span>
                        <span className="text-sm text-s-muted">
                          {String(Number(tax.value))}
                          {tax.type === 'PERCENTAGE' ? '%' : ' €'}
                        </span>
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => void onDeleteTax(tax.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          {t('delete')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              disabled={readOnly}
              onClick={() => void onSaveVat()}
            >
              {tc('save')}
            </Button>
          </div>
        </Card>
      )}

      {activeSection === 'stock' && (
        <Card className="border-s-border/80 shadow-sm">
          <SettingsSectionHeader
            icon={Warehouse}
            title={t('nav_stock')}
            description={t('stockSectionIntro')}
          />
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border border-s-border bg-slate-50 p-4">
              <div>
                <p className="text-sm font-medium text-s-navy">{t('stockManagementEnabled')}</p>
                <p className="mt-1 text-xs text-s-muted">{t('stockManagementEnabledHint')}</p>
              </div>
              <Switch
                checked={form.stockManagementEnabled}
                disabled={readOnly}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, stockManagementEnabled: checked }))
                }
              />
            </div>
            <Button
              type="button"
              variant="primary"
              disabled={readOnly}
              onClick={() => void onSaveStock()}
            >
              {tc('save')}
            </Button>
          </div>
        </Card>
      )}

      {activeSection === 'categories' && (
        <Card className="border-s-border/80 shadow-sm">
          <SettingsSectionHeader
            icon={Tags}
            title={t('nav_categories')}
            description={t('categoriesIntro')}
          />
          <CategoriesSection />
        </Card>
      )}

      {activeSection === 'utilisateurs' && (
        <Card className="border-s-border/80 shadow-sm">
          <SettingsSectionHeader
            icon={Users}
            title={t('nav_collaborators')}
            description={t('usersSectionDesc')}
          />
          <UsersSection readOnly={readOnly} />
        </Card>
      )}

      {activeSection === 'roles' && (
        <Card className="border-s-border/80 shadow-sm">
          <SettingsSectionHeader
            icon={Shield}
            title={t('nav_roles')}
            description={t('permissionsHint')}
          />
        </Card>
      )}
    </SettingsLayout>
  );
}

export default function SettingsPage() {
  const tc = useTranslations('common');
  return (
    <Suspense fallback={<p className="text-sm text-s-muted">{tc('loading')}</p>}>
      <SettingsPageContent />
    </Suspense>
  );
}
