'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { apiFetch, downloadQuotePdfFromApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';

type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

type QuoteDetail = {
  id: string;
  number: string | null;
  issueDate: string;
  validUntil: string | null;
  currency: string;
  status: QuoteStatus;
  subtotalHt: unknown;
  vatTotal: unknown;
  totalTtc: unknown;
  notes: string | null;
  client: { name: string };
  lines: {
    id: string;
    description: string;
    quantity: unknown;
    unitPriceHt: unknown;
    taxRate: unknown;
    lineTotalHt: unknown;
    lineVat: unknown;
    lineTotalTtc: unknown;
  }[];
  convertedInvoice: { id: string; number: string | null; status: string } | null;
};

const EMITTED_STATUSES: QuoteStatus[] = ['SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations('quotes');
  const tp = useTranslations('products');
  const ts = useTranslations('status');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const { token } = useAuth();
  const [q, setQ] = useState<QuoteDetail | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusPending, setStatusPending] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<QuoteDetail>(`/quotes/${id}`);
    setQ(data);
    setSelectedStatus(data.status);
  }, [id]);

  useEffect(() => {
    if (!token || !id) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
  }, [token, id, load, toast]);

  async function saveStatus() {
    if (!q || !selectedStatus || selectedStatus === q.status) return;
    setStatusPending(true);
    try {
      await apiFetch(`/quotes/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: selectedStatus }),
      });
      await load();
      toast.push('Statut mis à jour');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setStatusPending(false);
    }
  }

  async function validateQuote() {
    setStatusPending(true);
    try {
      await apiFetch(`/quotes/${id}/validate`, { method: 'POST' });
      await load();
      toast.push('Devis validé — numéro attribué');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setStatusPending(false);
    }
  }

  async function convertToInvoice() {
    setStatusPending(true);
    try {
      const inv = await apiFetch<{ id: string }>(`/quotes/${id}/convert-to-invoice`, {
        method: 'POST',
      });
      toast.push('Facture brouillon créée');
      router.push(`/invoices/${inv.id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setStatusPending(false);
    }
  }

  async function onDelete() {
    try {
      await apiFetch(`/quotes/${id}`, { method: 'DELETE' });
      toast.push('Supprimé');
      router.push('/quotes');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function onDownloadPdf() {
    if (!q) return;
    try {
      await downloadQuotePdfFromApi(q.id, q.number ?? `devis-${q.id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  if (!q) {
    return <p className="text-sm text-s-muted">{tc('loading')}</p>;
  }

  const showStatusEditor = q.status !== 'CONVERTED' && !(q.status === 'DRAFT' && !q.number);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/quotes" className="text-sm text-s-muted hover:text-s-navy">
          ← {tc('back')}
        </Link>
        <StatusBadge status={q.status} label={ts(q.status)} />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-s-navy">
            {t('detailTitle')} {q.number ?? t('draftNoNumber')}
          </h1>
          <p className="text-sm text-s-muted">
            {q.client.name} · {format(new Date(q.issueDate), 'dd/MM/yyyy')}
            {q.validUntil
              ? ` · ${t('validUntil')} ${format(new Date(q.validUntil), 'dd/MM/yyyy')}`
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void onDownloadPdf()}>
            {t('exportPdf')}
          </Button>
          {q.status === 'DRAFT' ? (
            <Button type="button" variant="danger" size="sm" onClick={() => setDelOpen(true)}>
              {t('deleteDraft')}
            </Button>
          ) : null}
        </div>
      </div>

      {q.status === 'CONVERTED' && q.convertedInvoice ? (
        <Card>
          <CardTitle className="mb-2">{t('convertedInvoice')}</CardTitle>
          <Link
            href={`/invoices/${q.convertedInvoice.id}`}
            className="text-sm font-medium text-s-accent hover:underline"
          >
            {t('openInvoice')} ({q.convertedInvoice.number ?? '—'})
          </Link>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">{t('lines')}</CardTitle>
          <div className="overflow-x-auto text-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-s-border text-xs text-s-muted">
                  <th className="pb-2 text-start">{tp('name')}</th>
                  <th className="pb-2 text-end">Qté</th>
                  <th className="pb-2 text-end">HT</th>
                  <th className="pb-2 text-end">TTC</th>
                </tr>
              </thead>
              <tbody>
                {q.lines.map((l) => (
                  <tr key={l.id} className="border-b border-s-border/40">
                    <td className="py-2">{l.description}</td>
                    <td className="py-2 text-end">{Number(l.quantity)}</td>
                    <td className="py-2 text-end">{Number(l.lineTotalHt).toFixed(3)}</td>
                    <td className="py-2 text-end">{Number(l.lineTotalTtc).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 space-y-1 border-t border-s-border pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-s-muted">{t('subtotalHt')}</span>
              <span>
                {Number(q.subtotalHt).toFixed(3)} {q.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-s-muted">TPS (5%)</span>
              <span>
                {(Number(q.subtotalHt) * 0.05).toFixed(3)} {q.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-s-muted">TVQ (9,975%)</span>
              <span>
                {(Number(q.subtotalHt) * 0.09975).toFixed(3)} {q.currency}
              </span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>{t('totalTtc')}</span>
              <span>
                {Number(q.totalTtc).toFixed(3)} {q.currency}
              </span>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle className="mb-2">{t('statusAction')}</CardTitle>
            {q.status === 'DRAFT' && !q.number ? (
              <p className="mb-3 text-xs text-s-muted">
                Validez le devis pour attribuer le numéro officiel (préfixe défini dans les
                paramètres).
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {q.status === 'DRAFT' && !q.number ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={statusPending}
                  onClick={() => void validateQuote()}
                >
                  {t('validateQuote')}
                </Button>
              ) : null}
              {q.status === 'ACCEPTED' ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={statusPending}
                  onClick={() => void convertToInvoice()}
                >
                  {t('convertToInvoice')}
                </Button>
              ) : null}
            </div>
            {showStatusEditor ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <select
                  className="rounded-xl border border-s-border px-3 py-2 text-sm"
                  value={selectedStatus ?? q.status}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {EMITTED_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {ts(s)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={statusPending || (selectedStatus ?? q.status) === q.status}
                  onClick={() => void saveStatus()}
                >
                  {tc('save')}
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <Modal
        open={delOpen}
        title={t('deleteDraft')}
        onClose={() => setDelOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setDelOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="danger" onClick={() => void onDelete()}>
              {tc('confirm')}
            </Button>
          </>
        }
      >
        <p>Supprimer définitivement ce brouillon ?</p>
      </Modal>
    </div>
  );
}
