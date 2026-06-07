'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { apiFetch, downloadInvoicePdfFromApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import {
  InvoicePreviewDocument,
  type InvoicePreviewData,
} from '@/components/invoices/invoice-preview-document';
import {
  InvoicePreviewRail,
  type InvoicePreviewPanel,
} from '@/components/invoices/invoice-preview-rail';
import type {
  AvailableDeposit,
  DocumentSettings,
} from '@/components/invoices/document-settings-drawer';
import { DocumentEditorActionBar } from '@/components/invoices/document-editor-action-bar';
import { pdf } from '@react-pdf/renderer';
import { InvoiceDoc, type InvoicePdfData } from '@/components/invoices/invoice-pdf';

export type InvoicePreviewPayload = {
  clientId: string;
  issueDate: string;
  notes?: string;
  kind: 'STANDARD' | 'DEPOSIT';
  appliedDepositId?: string | null;
  settings: DocumentSettings;
  lines: {
    description: string;
    quantity: number;
    unitPriceHt: number;
    taxRate: number;
    productId: string | null;
  }[];
};

type InvoicePreviewModalProps = {
  open: boolean;
  onClose: () => void;
  previewData: InvoicePreviewData;
  payload: InvoicePreviewPayload;
  settings: DocumentSettings;
  onSettingsChange: (settings: DocumentSettings) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  invoiceKind: 'STANDARD' | 'DEPOSIT';
  clientId: string;
  availableDeposits: AvailableDeposit[];
  invoiceId?: string | null;
  onInvoiceIdChange?: (id: string) => void;
  pdfData?: InvoicePdfData;
};

export function InvoicePreviewModal({
  open,
  onClose,
  previewData,
  payload,
  settings,
  onSettingsChange,
  notes,
  onNotesChange,
  invoiceKind,
  clientId,
  availableDeposits,
  invoiceId: initialInvoiceId,
  onInvoiceIdChange,
  pdfData,
}: InvoicePreviewModalProps) {
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const [activePanel, setActivePanel] = useState<InvoicePreviewPanel>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(initialInvoiceId ?? null);
  const [pending, setPending] = useState<'draft' | 'finalize' | 'delete' | null>(null);

  useEffect(() => {
    setInvoiceId(initialInvoiceId ?? null);
  }, [initialInvoiceId, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const persistDraft = useCallback(async (): Promise<string> => {
    if (!payload.clientId) {
      throw new Error('Sélectionnez un client.');
    }
    if (!payload.lines.length) {
      throw new Error('Ajoutez au moins une ligne.');
    }

    const { appliedDepositId, ...docSettings } = payload.settings;
    const body = {
      clientId: payload.clientId,
      issueDate: new Date(payload.issueDate).toISOString(),
      notes: payload.notes,
      kind: payload.kind,
      appliedDepositId:
        payload.kind !== 'DEPOSIT' && appliedDepositId ? appliedDepositId : undefined,
      ...docSettings,
      lines: payload.lines,
    };

    if (invoiceId) {
      await apiFetch(`/invoices/${invoiceId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return invoiceId;
    }

    const inv = await apiFetch<{ id: string }>('/invoices', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setInvoiceId(inv.id);
    onInvoiceIdChange?.(inv.id);
    return inv.id;
  }, [invoiceId, payload, onInvoiceIdChange]);

  async function saveDraft() {
    setPending('draft');
    try {
      const id = await persistDraft();
      toast.push(t('previewDraftSaved'));
      router.push(`/invoices/${id}`);
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
      await apiFetch(`/invoices/${id}/validate`, { method: 'POST' });
      toast.push(t('previewFinalized'));
      router.push(`/invoices/${id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    } finally {
      setPending(null);
    }
  }

  async function deleteDraft() {
    if (!invoiceId) {
      onClose();
      return;
    }
    if (!window.confirm(t('deleteDraftConfirm'))) return;
    setPending('delete');
    try {
      await apiFetch(`/invoices/${invoiceId}`, { method: 'DELETE' });
      toast.push(t('toastInvoiceDeleted'));
      router.push('/invoices');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    } finally {
      setPending(null);
    }
  }

  async function downloadPdf() {
    if (invoiceId) {
      try {
        await downloadInvoicePdfFromApi(invoiceId, `${previewData.number}.pdf`);
      } catch (e: unknown) {
        toast.push(e instanceof Error ? e.message : tc('error'), 'error');
      }
      return;
    }
    if (!pdfData) return;
    try {
      const blob = await pdf(<InvoiceDoc data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${previewData.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    }
  }

  if (!open || typeof document === 'undefined') return null;

  const pageTitle = invoiceKind === 'DEPOSIT' ? t('depositSectionTitle') : t('detailTitle');

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-slate-100"
      role="dialog"
      aria-modal="true"
    >
      <div className="shrink-0 border-b border-s-border bg-white px-4 md:px-6">
        <DocumentEditorActionBar
          title={pageTitle}
          number={previewData.number}
          previewLabel={t('preview')}
          saveDraftLabel={t('saveDraft')}
          saveAndFinalizeLabel={t('saveAndFinalize')}
          loadingLabel={tc('loading')}
          deleteAriaLabel={t('deleteDraft')}
          downloadAriaLabel={t('actionDownloadPdf')}
          closeAriaLabel={tc('cancel')}
          pending={pending}
          className="relative top-auto z-auto -mx-0 mb-0 border-b-0 md:-mx-0"
          onDelete={() => void deleteDraft()}
          onDownload={() => void downloadPdf()}
          onPreview={() => setActivePanel(null)}
          onSaveDraft={() => void saveDraft()}
          onSaveAndFinalize={() => void saveAndFinalize()}
          onClose={onClose}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto p-6 md:p-10">
          <InvoicePreviewDocument data={previewData} />
        </div>

        <InvoicePreviewRail
          settings={settings}
          onSettingsChange={onSettingsChange}
          notes={notes}
          onNotesChange={onNotesChange}
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          documentType="invoice"
          invoiceKind={invoiceKind}
          clientId={clientId}
          availableDeposits={availableDeposits}
          onPrint={() => window.print()}
          canSend={false}
        />
      </div>
    </div>,
    document.body
  );
}
