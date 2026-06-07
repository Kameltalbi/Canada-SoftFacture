'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { apiFetch, downloadQuotePdfFromApi } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import {
  QuotePreviewDocument,
  type QuotePreviewData,
} from '@/components/invoices/quote-preview-document';
import {
  InvoicePreviewRail,
  type InvoicePreviewPanel,
} from '@/components/invoices/invoice-preview-rail';
import type { DocumentSettings } from '@/components/invoices/document-settings-drawer';
import { DocumentEditorActionBar } from '@/components/invoices/document-editor-action-bar';
import { pdf } from '@react-pdf/renderer';
import { QuoteDoc, type QuotePdfData } from '@/components/invoices/quote-pdf';

export type QuotePreviewPayload = {
  clientId: string;
  issueDate: string;
  validUntil?: string | null;
  notes?: string;
  settings: DocumentSettings;
  lines: {
    description: string;
    quantity: number;
    unitPriceHt: number;
    taxRate: number;
    productId: string | null;
  }[];
};

type QuotePreviewModalProps = {
  open: boolean;
  onClose: () => void;
  previewData: QuotePreviewData;
  payload: QuotePreviewPayload;
  settings: DocumentSettings;
  onSettingsChange: (settings: DocumentSettings) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  clientId: string;
  quoteId?: string | null;
  onQuoteIdChange?: (id: string) => void;
  pdfData?: QuotePdfData;
};

export function QuotePreviewModal({
  open,
  onClose,
  previewData,
  payload,
  settings,
  onSettingsChange,
  notes,
  onNotesChange,
  clientId,
  quoteId: initialQuoteId,
  onQuoteIdChange,
  pdfData,
}: QuotePreviewModalProps) {
  const t = useTranslations('quotes');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const [activePanel, setActivePanel] = useState<InvoicePreviewPanel>(null);
  const [quoteId, setQuoteId] = useState<string | null>(initialQuoteId ?? null);
  const [pending, setPending] = useState<'draft' | 'finalize' | 'delete' | null>(null);

  useEffect(() => {
    setQuoteId(initialQuoteId ?? null);
  }, [initialQuoteId, open]);

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

    const body = {
      clientId: payload.clientId,
      issueDate: new Date(payload.issueDate).toISOString(),
      validUntil: payload.validUntil ? new Date(payload.validUntil).toISOString() : null,
      notes: payload.notes,
      ...payload.settings,
      lines: payload.lines,
    };

    if (quoteId) {
      await apiFetch(`/quotes/${quoteId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return quoteId;
    }

    const q = await apiFetch<{ id: string }>('/quotes', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setQuoteId(q.id);
    onQuoteIdChange?.(q.id);
    return q.id;
  }, [quoteId, payload, onQuoteIdChange]);

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
    if (!quoteId) {
      onClose();
      return;
    }
    if (!window.confirm(t('deleteConfirm'))) return;
    setPending('delete');
    try {
      await apiFetch(`/quotes/${quoteId}`, { method: 'DELETE' });
      toast.push(t('toastDeleted'));
      router.push('/quotes');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    } finally {
      setPending(null);
    }
  }

  async function downloadPdf() {
    if (quoteId) {
      try {
        await downloadQuotePdfFromApi(quoteId, `${previewData.number}.pdf`);
      } catch (e: unknown) {
        toast.push(e instanceof Error ? e.message : tc('error'), 'error');
      }
      return;
    }
    if (!pdfData) return;
    try {
      const blob = await pdf(<QuoteDoc data={pdfData} />).toBlob();
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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-slate-100"
      role="dialog"
      aria-modal="true"
    >
      <div className="shrink-0 border-b border-s-border bg-white px-4 md:px-6">
        <DocumentEditorActionBar
          title={t('detailTitle')}
          number={previewData.number}
          previewLabel={t('preview')}
          saveDraftLabel={t('saveDraft')}
          saveAndFinalizeLabel={t('saveAndFinalize')}
          loadingLabel={tc('loading')}
          deleteAriaLabel={t('deleteDraft')}
          downloadAriaLabel={t('exportPdf')}
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
          <QuotePreviewDocument data={previewData} />
        </div>

        <InvoicePreviewRail
          settings={settings}
          onSettingsChange={onSettingsChange}
          notes={notes}
          onNotesChange={onNotesChange}
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          documentType="quote"
          clientId={clientId}
          onPrint={() => window.print()}
          canSend={false}
        />
      </div>
    </div>,
    document.body
  );
}
