'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { apiFetch, downloadInvoicePdfFromApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { useDocumentNumberPreview } from '@/hooks/use-document-number-preview';
import { format } from 'date-fns';

type Org = {
  id: string;
  name: string;
  taxMatricule: string | null;
  address: string | null;
  city: string | null;
  country: string;
};

type InvStatus = 'DRAFT' | 'VALIDATED' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

type PayMethod = 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CARTE' | 'INTERAC';

type PaymentRow = {
  id: string;
  amount: unknown;
  paymentDate: string;
  method: PayMethod;
  reference: string | null;
  notes: string | null;
};

type InvDetail = {
  id: string;
  number: string | null;
  kind?: 'STANDARD' | 'DEPOSIT' | 'CREDIT_NOTE';
  operationNature?: 'GOODS' | 'SERVICES' | 'MIXED';
  vatOnDebits?: boolean;
  useDifferentDeliveryAddress?: boolean;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryCountry?: string | null;
  creditedInvoice?: { id: string; number: string | null; issueDate?: string } | null;
  creditNote?: { id: string; number: string | null; status: string } | null;
  invoiceYear: number | null;
  sequenceNumber: number | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  status: InvStatus;
  subtotalHt: unknown;
  vatTotal: unknown;
  totalTtc: unknown;
  advanceDeduction?: unknown;
  netToPay?: unknown;
  appliedDeposit?: { id: string; number: string | null; totalTtc?: unknown } | null;
  payments?: PaymentRow[];
  client: {
    name: string;
    siren?: string | null;
    taxId: string | null;
    address: string | null;
    city: string | null;
    country: string;
  };
  organization: Org;
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
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations('invoices');
  const tp = useTranslations('products');
  const ts = useTranslations('status');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const { token } = useAuth();
  const [inv, setInv] = useState<InvDetail | null>(null);
  const [delOpen, setDelOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<PayMethod>('VIREMENT');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const paidTotal = useMemo(() => {
    if (!inv?.payments?.length) return 0;
    return inv.payments.reduce((s, p) => s + Number(p.amount), 0);
  }, [inv]);

  const remaining = useMemo(() => {
    if (!inv) return 0;
    return Math.max(0, Number(inv.totalTtc) - paidTotal);
  }, [inv, paidTotal]);

  const canRecordPayment = Boolean(
    inv && ['VALIDATED', 'SENT', 'PARTIALLY_PAID'].includes(inv.status) && remaining > 0.0005
  );

  const previewType = inv?.kind === 'DEPOSIT' ? 'deposit' : 'invoice';
  const { nextNumber: previewNumber } = useDocumentNumberPreview(
    previewType,
    inv?.issueDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    Boolean(inv && inv.status === 'DRAFT' && !inv.number)
  );
  const displayNumber = inv?.number ?? previewNumber;

  const load = useCallback(async () => {
    const data = await apiFetch<InvDetail>(`/invoices/${id}`);
    setInv(data);
    setSelectedStatus(data.status);
  }, [id]);

  useEffect(() => {
    if (!token || !id) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
  }, [token, id, load, toast]);

  async function saveStatus() {
    if (!inv || !selectedStatus || selectedStatus === inv.status) return;
    setStatusPending(true);
    try {
      await apiFetch(`/invoices/${id}/status`, {
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

  async function applyInvoiceFromPaymentResponse(invoice: InvDetail) {
    setInv(invoice);
    setSelectedStatus(invoice.status);
  }

  async function recordFullPayment() {
    if (!inv || remaining <= 0) return;
    setStatusPending(true);
    try {
      const { invoice } = await apiFetch<{ invoice: InvDetail }>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: inv.id,
          amount: remaining,
          paymentDate: new Date().toISOString(),
          method: 'VIREMENT',
        }),
      });
      await applyInvoiceFromPaymentResponse(invoice);
      toast.push('Paiement enregistré');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setStatusPending(false);
    }
  }

  async function submitPayment() {
    if (!inv) return;
    const amt = parseFloat(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.push('Montant invalide', 'error');
      return;
    }
    setStatusPending(true);
    try {
      const { invoice } = await apiFetch<{ invoice: InvDetail }>('/payments', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: inv.id,
          amount: amt,
          paymentDate: new Date(payDate).toISOString(),
          method: payMethod,
          reference: payRef.trim() || null,
          notes: payNotes.trim() || null,
        }),
      });
      await applyInvoiceFromPaymentResponse(invoice);
      toast.push('Paiement enregistré');
      setPayOpen(false);
      setPayNotes('');
      setPayRef('');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setStatusPending(false);
    }
  }

  async function validateInvoice() {
    setStatusPending(true);
    try {
      await apiFetch(`/invoices/${id}/validate`, { method: 'POST' });
      await load();
      toast.push('Facture validée — numéro attribué');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setStatusPending(false);
    }
  }

  async function cancelInvoice() {
    setStatusPending(true);
    try {
      await apiFetch(`/invoices/${id}/cancel`, { method: 'POST' });
      await load();
      setCancelOpen(false);
      toast.push('Facture annulée');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setStatusPending(false);
    }
  }

  async function onDelete() {
    try {
      await apiFetch(`/invoices/${id}`, { method: 'DELETE' });
      toast.push('Supprimé');
      router.push('/invoices');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  async function createCreditNote() {
    if (!inv) return;
    setStatusPending(true);
    try {
      const credit = await apiFetch<{ id: string }>(`/invoices/${inv.id}/credit-note`, {
        method: 'POST',
      });
      toast.push(t('creditNoteCreated'));
      router.push(`/invoices/${credit.id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setStatusPending(false);
    }
  }

  async function onDownloadPdf() {
    if (!inv) return;
    try {
      await downloadInvoicePdfFromApi(inv.id, inv.number ?? `facture-${inv.id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  if (!inv) {
    return <p className="text-sm text-s-muted">{tc('loading')}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/invoices" className="text-sm text-s-muted hover:text-s-navy">
          ← {tc('back')}
        </Link>
        <StatusBadge
          status={inv.status}
          label={ts(
            inv.status as 'DRAFT' | 'VALIDATED' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED'
          )}
        />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-s-navy">
            {inv.kind === 'DEPOSIT'
              ? t('depositSectionTitle')
              : inv.kind === 'CREDIT_NOTE'
                ? t('creditNoteTitle')
                : t('detailTitle')}{' '}
            {displayNumber ?? t('draftNoNumber')}
            {!inv.number && previewNumber ? (
              <span className="ms-2 text-sm font-normal text-s-muted">
                ({t('numberProvisional')})
              </span>
            ) : null}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-s-muted">
            <span>
              {inv.client.name} · {format(new Date(inv.issueDate), 'dd/MM/yyyy')}
            </span>
            {inv.kind === 'DEPOSIT' ? (
              <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                {t('depositBadge')}
              </span>
            ) : null}
            {inv.kind === 'CREDIT_NOTE' ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                {t('creditNoteBadge')}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {inv.kind === 'STANDARD' &&
          !inv.creditNote &&
          inv.status !== 'DRAFT' &&
          inv.status !== 'CANCELLED' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={statusPending}
              onClick={() => void createCreditNote()}
            >
              {t('createCreditNote')}
            </Button>
          ) : null}
          {inv.creditNote ? (
            <Link href={`/invoices/${inv.creditNote.id}`}>
              <Button type="button" variant="secondary" size="sm">
                {t('viewCreditNote')}
              </Button>
            </Link>
          ) : null}
          {inv.creditedInvoice ? (
            <Link href={`/invoices/${inv.creditedInvoice.id}`}>
              <Button type="button" variant="ghost" size="sm">
                {t('viewCreditedInvoice')} ({inv.creditedInvoice.number ?? '—'})
              </Button>
            </Link>
          ) : null}
          <Button type="button" variant="secondary" size="sm" onClick={() => void onDownloadPdf()}>
            {t('exportPdf')}
          </Button>
          {inv.status === 'DRAFT' ? (
            <Button type="button" variant="danger" size="sm" onClick={() => setDelOpen(true)}>
              {t('deleteDraft')}
            </Button>
          ) : null}
        </div>
      </div>

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
                {inv.lines.map((l) => (
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
                {Number(inv.subtotalHt).toFixed(3)} {inv.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-s-muted">{t('vat')}</span>
              <span>
                {Number(inv.vatTotal).toFixed(3)} {inv.currency}
              </span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>{t('totalTtc')}</span>
              <span>
                {Number(inv.totalTtc).toFixed(3)} {inv.currency}
              </span>
            </div>
            {Number(inv.advanceDeduction ?? 0) > 0 ? (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-s-muted">
                    {t('advanceDeduction')}
                    {inv.appliedDeposit?.number ? ` (${inv.appliedDeposit.number})` : ''}
                  </span>
                  <span className="text-red-600">
                    − {Number(inv.advanceDeduction).toFixed(3)} {inv.currency}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold">
                  <span>{t('netToPay')}</span>
                  <span>
                    {Number(inv.netToPay ?? inv.totalTtc).toFixed(3)} {inv.currency}
                  </span>
                </div>
              </>
            ) : inv.kind !== 'DEPOSIT' ? (
              <div className="flex justify-between text-base font-bold">
                <span>{t('netToPay')}</span>
                <span>
                  {Number(inv.netToPay ?? inv.totalTtc).toFixed(3)} {inv.currency}
                </span>
              </div>
            ) : null}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardTitle className="mb-2">{t('statusAction')}</CardTitle>
            {inv.status === 'DRAFT' && !inv.number ? (
              <p className="mb-3 text-xs text-s-muted">
                {previewNumber
                  ? t('numberPreviewHintDetail', { number: previewNumber })
                  : t('numberPreviewHint')}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {inv.status === 'DRAFT' && !inv.number ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={statusPending}
                  onClick={() => void validateInvoice()}
                >
                  {t('validateInvoice')}
                </Button>
              ) : null}
              {['VALIDATED', 'SENT', 'PARTIALLY_PAID'].includes(inv.status) ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={statusPending}
                  onClick={() => setCancelOpen(true)}
                >
                  {t('cancelInvoice')}
                </Button>
              ) : null}
            </div>
            {inv.status === 'DRAFT' && !inv.number ? null : (
              <div className="mt-4 flex flex-wrap gap-2">
                <select
                  className="rounded-xl border border-s-border px-3 py-2 text-sm"
                  value={selectedStatus ?? inv.status}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {(
                    ['DRAFT', 'VALIDATED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] as const
                  ).map((s) => (
                    <option key={s} value={s}>
                      {ts(s)}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={statusPending || (selectedStatus ?? inv.status) === inv.status}
                  onClick={() => void saveStatus()}
                >
                  {tc('save')}
                </Button>
              </div>
            )}
          </Card>

          {inv.status !== 'DRAFT' && inv.status !== 'CANCELLED' ? (
            <Card>
              <CardTitle className="mb-2">{t('paymentsTitle')}</CardTitle>
              <div className="mb-3 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-s-muted">{t('paidTotal')} : </span>
                  <span className="font-semibold text-s-navy">
                    {paidTotal.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} {inv.currency}
                  </span>
                </div>
                <div>
                  <span className="text-s-muted">{t('remaining')} : </span>
                  <span className="font-semibold text-s-navy">
                    {remaining.toLocaleString('fr-FR', { maximumFractionDigits: 3 })} {inv.currency}
                  </span>
                </div>
              </div>
              {(inv.payments ?? []).length ? (
                <div className="mb-4 overflow-x-auto text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-s-border text-s-muted">
                        <th className="pb-2 text-start">{t('dateLabel')}</th>
                        <th className="pb-2 text-end">{t('amountLabel')}</th>
                        <th className="pb-2 text-start">{t('methodLabel')}</th>
                        <th className="pb-2 text-start">{t('refLabel')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inv.payments ?? []).map((p) => (
                        <tr key={p.id} className="border-b border-s-border/40">
                          <td className="py-2">{format(new Date(p.paymentDate), 'dd/MM/yyyy')}</td>
                          <td className="py-2 text-end">
                            {Number(p.amount).toLocaleString('fr-FR', { maximumFractionDigits: 3 })}
                          </td>
                          <td className="py-2">
                            {p.method === 'VIREMENT'
                              ? t('methodVIREMENT')
                              : p.method === 'CHEQUE'
                                ? t('methodCHEQUE')
                                : p.method === 'ESPECES'
                                  ? t('methodESPECES')
                                  : t('methodCARTE')}
                          </td>
                          <td className="py-2">{p.reference ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mb-3 text-xs text-s-muted">{t('noPayments')}</p>
              )}
              {canRecordPayment ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={statusPending}
                    onClick={() => {
                      setPayAmount(remaining.toFixed(3));
                      setPayDate(new Date().toISOString().slice(0, 10));
                      setPayMethod('VIREMENT');
                      setPayRef('');
                      setPayNotes('');
                      setPayOpen(true);
                    }}
                  >
                    {t('addPayment')}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={statusPending}
                    onClick={() => void recordFullPayment()}
                  >
                    {t('payFullBalance')}
                  </Button>
                </div>
              ) : null}
            </Card>
          ) : null}
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

      <Modal
        open={cancelOpen}
        title={t('cancelInvoice')}
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setCancelOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={statusPending}
              onClick={() => void cancelInvoice()}
            >
              {tc('confirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-s-muted">
          Le numéro reste réservé. La facture passera au statut « annulée ».
        </p>
      </Modal>

      <Modal
        open={payOpen}
        title={t('addPayment')}
        onClose={() => setPayOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setPayOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={statusPending}
              onClick={() => void submitPayment()}
            >
              {tc('confirm')}
            </Button>
          </>
        }
      >
        <div className="mt-2 space-y-3 text-sm">
          <div>
            <label className="mb-1 block text-xs text-s-muted">{t('amountLabel')}</label>
            <Input
              type="number"
              step="0.001"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-s-muted">{t('dateLabel')}</label>
            <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-s-muted">{t('methodLabel')}</label>
            <select
              className="w-full rounded-xl border border-s-border px-3 py-2 text-sm"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PayMethod)}
            >
              <option value="VIREMENT">{t('methodVIREMENT')}</option>
              <option value="CHEQUE">{t('methodCHEQUE')}</option>
              <option value="ESPECES">{t('methodESPECES')}</option>
              <option value="CARTE">{t('methodCARTE')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-s-muted">{t('refLabel')}</label>
            <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-s-muted">{t('notesLabel')}</label>
            <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
