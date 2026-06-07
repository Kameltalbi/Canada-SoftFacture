'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { DOCUMENT_LANGUAGES, type DocumentLanguageCode } from '@/lib/document-languages';

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'CHF'] as const;
const TRANSITION_MS = 300;

export type AvailableDeposit = {
  id: string;
  number: string | null;
  totalTtc: unknown;
  currency: string;
};

export interface DocumentSettings {
  /** Langue d'émission du PDF (interface toujours en français). */
  documentLanguage: DocumentLanguageCode;
  currency: string;
  applyVat: boolean;
  applyFiscalStamp: boolean;
  fiscalStamp: number;
  discountEnabled: boolean;
  discountRate: number;
  showCurrencyOnLines: boolean;
  /** Facture standard : id de la facture d’acompte à déduire */
  appliedDepositId: string | null;
}

type TabId = 'document' | 'general';

type DocumentSettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
  settings: DocumentSettings;
  onChange: (settings: DocumentSettings) => void;
  /** modal = panneau flottant (devis compact) ; dock = colonne latérale qui pousse le contenu */
  variant?: 'modal' | 'dock';
  documentType?: 'invoice' | 'quote' | 'recurring';
  invoiceKind?: 'STANDARD' | 'DEPOSIT';
  clientId?: string;
  availableDeposits?: AvailableDeposit[];
};

function SettingRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  trailing,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-s-navy">{label}</p>
        {description ? <p className="text-xs leading-relaxed text-s-muted">{description}</p> : null}
        {trailing}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-s-muted">
        {title}
      </p>
      <div className="divide-y divide-s-border rounded-xl border border-s-border bg-white px-4">
        {children}
      </div>
    </div>
  );
}

function formatDepositAmount(value: unknown, currency: string) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function SettingsPanelBody({
  localSettings,
  setLocalSettings,
  activeTab,
  setActiveTab,
  onCancel,
  onSave,
  documentType = 'invoice',
  invoiceKind = 'STANDARD',
  clientId,
  availableDeposits = [],
}: {
  localSettings: DocumentSettings;
  setLocalSettings: (s: DocumentSettings) => void;
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
  onCancel: () => void;
  onSave: () => void;
  documentType?: 'invoice' | 'quote' | 'recurring';
  invoiceKind?: 'STANDARD' | 'DEPOSIT';
  clientId?: string;
  availableDeposits?: AvailableDeposit[];
}) {
  const fiscalHint =
    localSettings.fiscalStamp > 0
      ? `${localSettings.fiscalStamp} ${localSettings.currency}`
      : 'Montant fixe additionnel';

  return (
    <>
      <div className="shrink-0 border-b border-s-border px-6 pb-0 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-s-navy">Paramètres et options</h2>
            <p className="mt-1 text-sm text-s-muted">
              Configurez la TVA, les remises et les options de ce document
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-s-muted transition hover:bg-slate-100 hover:text-s-navy"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex gap-6 border-b border-s-border">
          {(
            [
              { id: 'document' as const, label: 'Options du document' },
              { id: 'general' as const, label: 'Général' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                '-mb-px border-b-2 pb-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-[#2563eb] text-[#2563eb]'
                  : 'border-transparent text-s-muted hover:text-s-navy'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {activeTab === 'document' ? (
          <div className="space-y-6">
            <Section title="TVA et montants">
              <SettingRow
                label="Utiliser la TVA"
                description="Si désactivée, la ligne TVA n'apparaîtra pas dans la facture"
                checked={localSettings.applyVat}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, applyVat: checked })
                }
              />
              <SettingRow
                label="Activer les remises"
                description="Si désactivée, la colonne « Remise % » n'apparaîtra pas dans le tableau"
                checked={localSettings.discountEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, discountEnabled: checked })
                }
              />
            </Section>

            <Section title="Taxes personnalisées">
              <SettingRow
                label="Taxe fixe additionnelle"
                description={fiscalHint}
                checked={localSettings.applyFiscalStamp}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, applyFiscalStamp: checked })
                }
                trailing={
                  localSettings.applyFiscalStamp ? (
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={localSettings.fiscalStamp}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          fiscalStamp: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="mt-2 h-9 max-w-[140px]"
                    />
                  ) : null
                }
              />
            </Section>

            {documentType === 'invoice' && invoiceKind === 'STANDARD' ? (
              <Section title="Paiement et acompte">
                <SettingRow
                  label="Déduire un acompte perçu"
                  description={
                    clientId
                      ? 'Sélectionnez une facture d’acompte validée pour ce client'
                      : 'Sélectionnez d’abord un client sur le document'
                  }
                  checked={localSettings.appliedDepositId !== null}
                  onCheckedChange={(checked) =>
                    setLocalSettings({
                      ...localSettings,
                      appliedDepositId: checked ? (availableDeposits[0]?.id ?? null) : null,
                    })
                  }
                  disabled={!clientId || availableDeposits.length === 0}
                  trailing={
                    localSettings.appliedDepositId !== null ? (
                      availableDeposits.length ? (
                        <select
                          value={localSettings.appliedDepositId ?? ''}
                          onChange={(e) =>
                            setLocalSettings({
                              ...localSettings,
                              appliedDepositId: e.target.value || null,
                            })
                          }
                          className="mt-2 w-full rounded-lg border border-s-border bg-white px-3 py-2 text-sm text-s-navy focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25"
                        >
                          {availableDeposits.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.number ?? 'Brouillon'} —{' '}
                              {formatDepositAmount(d.totalTtc, d.currency)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-2 text-xs text-s-muted">
                          Aucune facture d’acompte disponible pour ce client.
                        </p>
                      )
                    ) : null
                  }
                />
              </Section>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <Section title="Langue du document">
              <div className="py-4">
                <label className="mb-2 block text-sm font-semibold text-s-navy">
                  Langue du PDF
                </label>
                <p className="mb-2 text-xs text-s-muted">
                  Libellés du document (facture, devis, avoir…) — l&apos;application reste en
                  français.
                </p>
                <select
                  value={localSettings.documentLanguage}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      documentLanguage: e.target.value as DocumentLanguageCode,
                    })
                  }
                  className="w-full rounded-lg border border-s-border bg-white px-3 py-2.5 text-sm text-s-navy focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25"
                >
                  {DOCUMENT_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </Section>

            <Section title="Devise">
              <div className="py-4">
                <label className="mb-2 block text-sm font-semibold text-s-navy">
                  Devise du document
                </label>
                <select
                  value={localSettings.currency}
                  onChange={(e) => setLocalSettings({ ...localSettings, currency: e.target.value })}
                  className="w-full rounded-lg border border-s-border bg-white px-3 py-2.5 text-sm text-s-navy focus:outline-none focus:ring-2 focus:ring-[#2563eb]/25"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </Section>

            <Section title="Affichage">
              <SettingRow
                label="Devise sur les lignes"
                description="Afficher le symbole ou le code devise à côté des montants du tableau"
                checked={localSettings.showCurrencyOnLines}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, showCurrencyOnLines: checked })
                }
              />
            </Section>

            {localSettings.discountEnabled ? (
              <Section title="Remise globale">
                <div className="py-4">
                  <label className="mb-2 block text-sm font-semibold text-s-navy">
                    Taux de remise (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={localSettings.discountRate}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        discountRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-9 max-w-[140px]"
                  />
                </div>
              </Section>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-s-border bg-white px-6 py-4">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-s-navy">
          Annuler
        </Button>
        <Button
          type="button"
          className="gap-2 bg-[#2563eb] px-5 text-white hover:bg-[#1d4ed8]"
          onClick={onSave}
        >
          <Check className="h-4 w-4" />
          Appliquer
        </Button>
      </div>
    </>
  );
}

export function DocumentSettingsDrawer({
  open,
  onClose,
  settings,
  onChange,
  variant = 'modal',
  documentType = 'invoice',
  invoiceKind = 'STANDARD',
  clientId,
  availableDeposits = [],
}: DocumentSettingsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<TabId>('document');

  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
      setActiveTab('document');
      if (variant === 'modal') {
        setMounted(true);
        const frame = requestAnimationFrame(() => {
          requestAnimationFrame(() => setVisible(true));
        });
        return () => cancelAnimationFrame(frame);
      }
      return;
    }

    if (variant === 'modal') {
      setVisible(false);
      const timer = window.setTimeout(() => setMounted(false), TRANSITION_MS);
      return () => window.clearTimeout(timer);
    }
  }, [open, settings, variant]);

  useEffect(() => {
    if (variant !== 'modal' || !mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLocalSettings(settings);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, onClose, settings, variant]);

  const handleSave = () => {
    onChange(localSettings);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(settings);
    onClose();
  };

  const body = (
    <SettingsPanelBody
      localSettings={localSettings}
      setLocalSettings={setLocalSettings}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onCancel={handleCancel}
      onSave={handleSave}
      documentType={documentType}
      invoiceKind={invoiceKind}
      clientId={clientId}
      availableDeposits={availableDeposits}
    />
  );

  if (variant === 'dock') {
    if (!open) return null;
    return <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col bg-white">{body}</div>;
  }

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <aside
      className={cn(
        'fixed inset-y-0 end-0 z-50 flex w-full max-w-[420px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out',
        visible ? 'translate-x-0' : 'translate-x-full'
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Paramètres et options"
    >
      {body}
    </aside>,
    document.body
  );
}
