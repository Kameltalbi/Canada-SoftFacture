'use client';

import { useEffect, useState } from 'react';
import { CircleHelp, Settings, SlidersHorizontal, StickyNote, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DocumentSettingsDrawer,
  type AvailableDeposit,
  type DocumentSettings,
} from '@/components/invoices/document-settings-drawer';
import {
  DOCUMENT_EDITOR_RAIL_BLEED_CLASS,
  DOCUMENT_RAIL_NAV_CLASS,
  documentRailItemClass,
  documentRailIconClass,
} from '@/components/invoices/document-rail-styles';

export type InvoiceEditorPanel = 'settings' | 'notes' | 'tools' | 'help' | null;

const PANEL_WIDTH = 420;

type InvoiceEditorShellProps = {
  children: React.ReactNode;
  settings: DocumentSettings;
  onSettingsChange: (settings: DocumentSettings) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  activePanel: InvoiceEditorPanel;
  onPanelChange: (panel: InvoiceEditorPanel) => void;
  documentType?: 'invoice' | 'quote' | 'recurring';
  invoiceKind?: 'STANDARD' | 'DEPOSIT';
  clientId?: string;
  availableDeposits?: AvailableDeposit[];
};

const railItems: {
  id: Exclude<InvoiceEditorPanel, null>;
  label: string;
  icon: typeof Settings;
}[] = [
  { id: 'settings', label: 'Options', icon: Settings },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'tools', label: 'Outils', icon: SlidersHorizontal },
  { id: 'help', label: 'Aide', icon: CircleHelp },
];

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
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col bg-white">
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

/** Layout éditeur : contenu + panneau latéral (push) + barre d’outils — sans overlay grisé. */
export function InvoiceEditorShell({
  children,
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
}: InvoiceEditorShellProps) {
  const isQuote = documentType === 'quote';
  const isRecurring = documentType === 'recurring';
  const docLabel = isQuote ? 'devis' : isRecurring ? 'modèle récurrent' : 'facture';
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

  return (
    <div className={cn('min-w-0', DOCUMENT_EDITOR_RAIL_BLEED_CLASS)}>
      <div
        className="grid min-w-0 transition-[grid-template-columns] duration-300 ease-out"
        style={{
          gridTemplateColumns: panelOpen
            ? `minmax(0, 1fr) ${PANEL_WIDTH}px 3.5rem`
            : 'minmax(0, 1fr) 0px 3.5rem',
        }}
      >
        <div className="min-w-0 overflow-hidden">{children}</div>

        <div
          className={cn(
            'min-w-0 overflow-hidden bg-white',
            panelOpen && 'border-s border-s-border'
          )}
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
                Notes internes
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

          {activePanel === 'tools' ? (
            <DockedPanel title="Outils" onClose={() => onPanelChange(null)}>
              <ul className="space-y-3 text-s-muted">
                <li className="rounded-lg border border-s-border bg-slate-50 px-4 py-3">
                  {isRecurring
                    ? 'Les factures sont générées automatiquement selon la fréquence du modèle.'
                    : isQuote
                      ? 'Dupliquer un devis existant depuis la liste des devis.'
                      : 'Dupliquer une facture existante depuis la liste des factures.'}
                </li>
                <li className="rounded-lg border border-s-border bg-slate-50 px-4 py-3">
                  {isRecurring
                    ? 'Utilisez « Générer les échéances » depuis la liste pour créer les factures dues.'
                    : 'Le PDF sera disponible après création et validation du brouillon.'}
                </li>
              </ul>
            </DockedPanel>
          ) : null}

          {activePanel === 'help' ? (
            <DockedPanel title="Aide" onClose={() => onPanelChange(null)}>
              <ul className="space-y-3 text-s-muted">
                <li>
                  {isRecurring ? (
                    <>
                      <strong className="text-s-navy">Options</strong> — devise, TVA, langue du PDF
                      généré.
                    </>
                  ) : (
                    <>
                      <strong className="text-s-navy">Options</strong> — devise, TVA, remise
                      globale.
                    </>
                  )}
                </li>
                <li>
                  <strong className="text-s-navy">Notes</strong> — texte libre visible sur{' '}
                  {isRecurring ? 'chaque facture générée' : `le ${docLabel}`}.
                </li>
                {!isRecurring ? (
                  <li>Le numéro définitif est attribué à la validation du {docLabel}.</li>
                ) : (
                  <li>
                    Activez « Valider et numéroter automatiquement » pour finaliser chaque facture
                    générée.
                  </li>
                )}
              </ul>
            </DockedPanel>
          ) : null}
        </div>

        <nav
          className={cn(DOCUMENT_RAIL_NAV_CLASS, 'min-h-[calc(100dvh-3.5rem)] self-stretch py-1')}
        >
          {railItems.map((item, index) => {
            const Icon = item.icon;
            const active = activePanel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPanelChange(active ? null : item.id)}
                className={cn(
                  'flex w-full flex-col items-center gap-1 px-1 py-3 text-[10px] font-medium transition',
                  index > 0 && 'border-t border-s-border/70',
                  documentRailItemClass(active)
                )}
              >
                <Icon className={documentRailIconClass} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
