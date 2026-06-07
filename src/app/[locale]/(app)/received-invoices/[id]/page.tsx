'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { AlertTriangle, ArrowLeft, Download } from 'lucide-react';
import {
  apiFetch,
  downloadReceivedInvoicePdfFromApi,
  downloadReceivedInvoiceXmlFromApi,
  type ReceivedInvoiceDetail,
  type ReceivedInvoiceStatus,
} from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatEuro } from '@/lib/format-money';
import { cn } from '@/lib/utils';
import { EinvoiceFeatureGate } from '@/components/einvoice/einvoice-feature-gate';

const STATUSES: ReceivedInvoiceStatus[] = [
  'RECEIVED',
  'ACCEPTED',
  'DISPUTED',
  'REFUSED',
  'COLLECTED',
];

const statusClass: Record<ReceivedInvoiceStatus, string> = {
  RECEIVED: 'bg-sky-50 text-sky-700 border-sky-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DISPUTED: 'bg-amber-50 text-amber-700 border-amber-200',
  REFUSED: 'bg-red-50 text-red-700 border-red-200',
  COLLECTED: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default function ReceivedInvoiceDetailPage() {
  return (
    <EinvoiceFeatureGate>
      <ReceivedInvoiceDetailContent />
    </EinvoiceFeatureGate>
  );
}

function ReceivedInvoiceDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations('receivedInvoices');
  const tc = useTranslations('common');
  const { token } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [row, setRow] = useState<ReceivedInvoiceDetail | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ReceivedInvoiceStatus>('RECEIVED');
  const [statusNote, setStatusNote] = useState('');
  const [statusPending, setStatusPending] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<ReceivedInvoiceDetail>(`/received-invoices/${id}`);
    setRow(data);
    setSelectedStatus(data.status);
    setStatusNote(data.statusNote ?? '');
  }, [id]);

  useEffect(() => {
    if (!token || !id) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
  }, [token, id, load, toast]);

  async function saveStatus() {
    if (!row) return;
    setStatusPending(true);
    try {
      await apiFetch(`/received-invoices/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: selectedStatus, statusNote: statusNote || null }),
      });
      await load();
      toast.push(t('statusUpdated'));
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setStatusPending(false);
    }
  }

  async function onDelete() {
    try {
      await apiFetch(`/received-invoices/${id}`, { method: 'DELETE' });
      toast.push(t('deleted'));
      router.push('/received-invoices');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  if (!row) {
    return <p className="p-8 text-center text-sm text-s-muted">{tc('loading')}</p>;
  }

  const statusChanged =
    selectedStatus !== row.status || (statusNote || '') !== (row.statusNote || '');

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <Link
        href="/received-invoices"
        className="inline-flex items-center gap-2 text-sm font-medium text-s-muted hover:text-s-navy"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToList')}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-s-navy">{t('detailTitle')}</h1>
          <p className="mt-1 text-lg font-semibold text-s-navy">{row.invoiceNumber}</p>
          <p className="text-sm text-s-muted">{row.supplierName}</p>
        </div>
        <span
          className={cn(
            'inline-flex self-start rounded-full border px-3 py-1 text-sm font-medium',
            statusClass[row.status]
          )}
        >
          {t(`status_${row.status}`)}
        </span>
      </div>

      {row.buyerMismatch ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          {t('buyerMismatch')}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            void downloadReceivedInvoicePdfFromApi(row.id, row.invoiceNumber).catch((e: unknown) =>
              toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
            )
          }
        >
          <Download className="me-2 h-4 w-4" />
          {t('downloadPdf')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            void downloadReceivedInvoiceXmlFromApi(row.id, row.invoiceNumber).catch((e: unknown) =>
              toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
            )
          }
        >
          <Download className="me-2 h-4 w-4" />
          {t('downloadXml')}
        </Button>
      </div>

      <Card>
        <CardTitle className="mb-4">{t('supplierInfo')}</CardTitle>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-s-muted">{t('supplier')}</dt>
            <dd className="font-medium">{row.supplierName}</dd>
          </div>
          {row.supplierSiren ? (
            <div>
              <dt className="text-s-muted">{t('siren')}</dt>
              <dd className="font-medium">{row.supplierSiren}</dd>
            </div>
          ) : null}
          {row.supplierVat ? (
            <div>
              <dt className="text-s-muted">TVA</dt>
              <dd className="font-medium">{row.supplierVat}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-s-muted">{t('issueDate')}</dt>
            <dd className="font-medium">
              {format(new Date(row.issueDate), 'dd MMM yyyy', { locale: frLocale })}
            </dd>
          </div>
          {row.dueDate ? (
            <div>
              <dt className="text-s-muted">{t('dueDate')}</dt>
              <dd className="font-medium">
                {format(new Date(row.dueDate), 'dd MMM yyyy', { locale: frLocale })}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-s-muted">{t('receivedAt')}</dt>
            <dd className="font-medium">
              {format(new Date(row.receivedAt), 'dd MMM yyyy HH:mm', { locale: frLocale })}
            </dd>
          </div>
          <div>
            <dt className="text-s-muted">{t('source')}</dt>
            <dd className="font-medium">{t(`source_${row.source}`)}</dd>
          </div>
          {row.facturXProfile ? (
            <div>
              <dt className="text-s-muted">{t('profile')}</dt>
              <dd className="font-medium">{row.facturXProfile}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {(row.buyerName || row.buyerSiren) && (
        <Card>
          <CardTitle className="mb-4">{t('buyerInfo')}</CardTitle>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {row.buyerName ? (
              <div>
                <dt className="text-s-muted">Nom</dt>
                <dd className="font-medium">{row.buyerName}</dd>
              </div>
            ) : null}
            {row.buyerSiren ? (
              <div>
                <dt className="text-s-muted">{t('siren')}</dt>
                <dd className="font-medium">{row.buyerSiren}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-4">{t('totals')}</CardTitle>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-s-muted">{t('subtotalHt')}</dt>
            <dd className="font-medium">{formatEuro(Number(row.subtotalHt))}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-s-muted">{t('vat')}</dt>
            <dd className="font-medium">{formatEuro(Number(row.vatTotal))}</dd>
          </div>
          <div className="flex justify-between border-t border-s-border pt-2 text-base">
            <dt className="font-semibold">{t('totalTtc')}</dt>
            <dd className="font-bold text-s-navy">{formatEuro(Number(row.totalTtc))}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <CardTitle className="mb-4">{t('status')}</CardTitle>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStatus(s)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  selectedStatus === s
                    ? statusClass[s]
                    : 'border-s-border bg-white text-s-muted hover:bg-slate-50'
                )}
              >
                {t(`status_${s}`)}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-sm text-s-muted" htmlFor="statusNote">
              {t('statusNote')}
            </label>
            <textarea
              id="statusNote"
              rows={3}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder={t('statusNotePlaceholder')}
              className="w-full rounded-lg border border-s-border px-3 py-2 text-sm"
            />
          </div>
          <Button
            type="button"
            disabled={!statusChanged || statusPending}
            onClick={() => void saveStatus()}
          >
            {statusPending ? tc('loading') : t('saveStatus')}
          </Button>
        </div>
      </Card>

      <div className="border-t border-s-border pt-6">
        <Button
          type="button"
          variant="ghost"
          className="text-red-600"
          onClick={() => setDelOpen(true)}
        >
          {t('delete')}
        </Button>
      </div>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title={t('delete')}>
        <p className="mb-4 text-sm text-s-muted">{t('deleteConfirm')}</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setDelOpen(false)}>
            {tc('cancel')}
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700"
            onClick={() => void onDelete()}
          >
            {t('delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
