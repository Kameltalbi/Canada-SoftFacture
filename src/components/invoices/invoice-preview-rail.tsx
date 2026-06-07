'use client';

import { useEffect, useState } from 'react';
import {
  CircleHelp,
  Palette,
  Paperclip,
  Printer,
  Send,
  Settings,
  SlidersHorizontal,
  StickyNote,
  X,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  DocumentSettingsDrawer,
  type AvailableDeposit,
  type DocumentSettings,
} from '@/components/invoices/document-settings-drawer';
import {
  DOCUMENT_RAIL_NAV_CLASS,
  documentRailItemClass,
  documentRailIconClass,
} from '@/components/invoices/document-rail-styles';

export type InvoicePreviewPanel =
  | 'attachments'
  | 'tools'
  | 'appearance'
  | 'settings'
  | 'notes'
  | 'help'
  | null;

const PANEL_WIDTH = 420;

type InvoicePreviewRailProps = {
  settings: DocumentSettings;
  onSettingsChange: (settings: DocumentSettings) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  activePanel: InvoicePreviewPanel;
  onPanelChange: (panel: InvoicePreviewPanel) => void;
  documentType?: 'invoice' | 'quote';
  invoiceKind?: 'STANDARD' | 'DEPOSIT';
  clientId?: string;
  availableDeposits?: AvailableDeposit[];
  onPrint: () => void;
  canSend?: boolean;
};

function DockedPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-s-border px-5 py-4">
        <h2 className="text-base font-semibold text-s-navy">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-s-muted transition hover:bg-slate-100 hover:text-s-navy"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 text-sm text-s-navy">{children}</div>
    </div>
  );
}

/** Barre latérale droite de l’aperçu facture (style Costructor). */
export function InvoicePreviewRail({
  settings,
  onSettingsChange,
  notes,
  onNotesChange,
  activePanel,
  onPanelChange,
  documentType = 'invoice',
  invoiceKind = 'STANDARD',
  clientId,
  availableDeposits = [],
  onPrint,
  canSend = false,
}: InvoicePreviewRailProps) {
  const isQuote = documentType === 'quote';
  const docLabel = isQuote ? 'devis' : 'facture';
  const [draftNotes, setDraftNotes] = useState(notes);
  const panelOpen = activePanel !== null;

  useEffect(() => {
    if (activePanel === 'notes') setDraftNotes(notes);
  }, [activePanel, notes]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onPanelChange(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelOpen, onPanelChange]);

  const items: {
    id: Exclude<InvoicePreviewPanel, null>;
    label: string;
    icon: typeof Settings;
  }[] = [
    { id: 'attachments', label: 'Pièces jointes (0)', icon: Paperclip },
    { id: 'tools', label: 'Outils', icon: SlidersHorizontal },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'settings', label: 'Options', icon: Settings },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'help', label: 'Aide', icon: CircleHelp },
  ];

  const footerItems = [
    { label: 'Imprimer', icon: Printer, onClick: onPrint },
    { label: 'Envoyer', icon: Send, disabled: !canSend },
  ];

  return (
    <div
      className="flex h-full shrink-0 self-stretch"
      style={{ width: panelOpen ? PANEL_WIDTH + 56 : 56 }}
    >
      <div
        className={cn(
          'min-w-0 overflow-hidden bg-white transition-all duration-300',
          panelOpen && 'border-s border-s-border'
        )}
        style={{ width: panelOpen ? PANEL_WIDTH : 0 }}
        aria-hidden={!panelOpen}
      >
        {activePanel === 'settings' ? (
          <DocumentSettingsDrawer
            variant="dock"
            open
            onClose={() => onPanelChange(null)}
            settings={settings}
            onChange={onSettingsChange}
            documentType={documentType}
            invoiceKind={invoiceKind}
            clientId={clientId}
            availableDeposits={availableDeposits}
          />
        ) : null}

        {activePanel === 'notes' ? (
          <DockedPanel title="Notes" onClose={() => onPanelChange(null)}>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-s-muted">
              Notes visibles sur le {docLabel}
            </label>
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              rows={8}
              className="w-full rounded-lg border border-s-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
              placeholder="Conditions particulières, mentions complémentaires…"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-s-border px-4 py-2 text-sm hover:bg-slate-50"
                onClick={() => onPanelChange(null)}
              >
                Fermer
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]"
                onClick={() => {
                  onNotesChange(draftNotes);
                  onPanelChange(null);
                }}
              >
                Enregistrer
              </button>
            </div>
          </DockedPanel>
        ) : null}

        {activePanel === 'attachments' ? (
          <DockedPanel title="Pièces jointes" onClose={() => onPanelChange(null)}>
            <p className="text-s-muted">Aucune pièce jointe pour le moment.</p>
          </DockedPanel>
        ) : null}

        {activePanel === 'appearance' ? (
          <DockedPanel title="Apparence" onClose={() => onPanelChange(null)}>
            <p className="text-s-muted">
              Personnalisez le modèle PDF et la couleur d&apos;accent depuis les paramètres de
              l&apos;organisation.
            </p>
            <Link
              href="/settings?s=templates"
              className="mt-4 inline-flex rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-hover"
            >
              Ouvrir l&apos;apparence des documents
            </Link>
          </DockedPanel>
        ) : null}

        {activePanel === 'tools' ? (
          <DockedPanel title="Outils" onClose={() => onPanelChange(null)}>
            <ul className="space-y-3 text-s-muted">
              <li className="rounded-lg border border-s-border bg-slate-50 px-4 py-3">
                Dupliquer une facture existante depuis la liste des factures.
              </li>
              <li className="rounded-lg border border-s-border bg-slate-50 px-4 py-3">
                L&apos;envoi par email sera disponible après finalisation.
              </li>
            </ul>
          </DockedPanel>
        ) : null}

        {activePanel === 'help' ? (
          <DockedPanel title="Aide" onClose={() => onPanelChange(null)}>
            <ul className="space-y-3 text-s-muted">
              <li>
                <strong className="text-s-navy">Enregistrer</strong> — sauvegarde le brouillon sans
                numéro définitif.
              </li>
              <li>
                <strong className="text-s-navy">Enregistrer et finaliser</strong> — attribue le
                numéro définitif à la facture.
              </li>
              <li>
                <strong className="text-s-navy">Options</strong> — devise, TVA, remise globale.
              </li>
            </ul>
          </DockedPanel>
        ) : null}
      </div>

      <nav className={cn(DOCUMENT_RAIL_NAV_CLASS, 'h-full min-h-0')}>
        {items.map((item, index) => {
          const Icon = item.icon;
          const active = activePanel === item.id;
          return (
            <button
              key={`${item.id}-${index}`}
              type="button"
              onClick={() => onPanelChange(active ? null : item.id)}
              className={cn(
                'flex w-full flex-col items-center gap-0.5 px-1 py-2.5 text-[9px] font-medium leading-tight transition',
                index > 0 && 'border-t border-s-border/70',
                documentRailItemClass(active)
              )}
            >
              <Icon className={documentRailIconClass} />
              <span className="max-w-[52px] text-center">{item.label}</span>
            </button>
          );
        })}
        <div className="mt-auto border-t border-s-border">
          {footerItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                disabled={item.disabled}
                onClick={item.onClick}
                className={cn(
                  'flex w-full flex-col items-center gap-0.5 px-1 py-2.5 text-[9px] font-medium leading-tight transition',
                  index > 0 && 'border-t border-s-border/70',
                  item.disabled
                    ? 'cursor-not-allowed text-slate-300'
                    : cn('text-s-navy', !item.disabled && 'hover:bg-slate-200/60 hover:text-s-navy')
                )}
              >
                <Icon className={documentRailIconClass} />
                <span className="max-w-[52px] text-center">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
