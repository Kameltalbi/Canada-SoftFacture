'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { format } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

type RecurringDetail = {
  id: string;
  title: string | null;
  frequency: string;
  dayOfMonth: number | null;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  autoValidate: boolean;
  dueDaysAfter: number;
  notes: string | null;
  client: { id: string; name: string };
  lines: { description: string; quantity: unknown; unitPriceHt: unknown; taxRate: unknown }[];
  generatedInvoices: {
    id: string;
    number: string | null;
    issueDate: string;
    status: string;
    totalTtc: unknown;
    currency: string;
  }[];
};

export default function RecurringInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const t = useTranslations('recurring');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();
  const { token } = useAuth();
  const [row, setRow] = useState<RecurringDetail | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch<RecurringDetail>(`/recurring-invoices/${id}`);
    setRow(data);
  }, [id]);

  useEffect(() => {
    if (!token || !id) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
    );
  }, [token, id, load, toast]);

  async function generateNow() {
    setPending(true);
    try {
      const res = await apiFetch<{ invoice: { id: string } }>(
        `/recurring-invoices/${id}/generate`,
        {
          method: 'POST',
        }
      );
      await load();
      toast.push(t('generated'));
      router.push(`/invoices/${res.invoice.id}`);
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setPending(false);
    }
  }

  async function togglePause() {
    if (!row) return;
    const next = row.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setPending(true);
    try {
      await apiFetch(`/recurring-invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      await load();
      toast.push(tc('save') + ' ✓');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await apiFetch(`/recurring-invoices/${id}`, { method: 'DELETE' });
      toast.push(tc('delete') + ' ✓');
      router.push('/recurring-invoices');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    }
  }

  if (!row) {
    return <p className="text-sm text-s-muted">{tc('loading')}</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/recurring-invoices" className="text-sm text-s-muted hover:text-s-navy">
        ← {tc('back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-s-navy">{row.title ?? t('untitled')}</h1>
          <p className="text-sm text-s-muted">
            {row.client.name} · {t(`freq_${row.frequency}`)} · {t(`status_${row.status}`)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {row.status === 'ACTIVE' ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={pending}
              onClick={() => void generateNow()}
            >
              {t('generateNow')}
            </Button>
          ) : null}
          {row.status !== 'COMPLETED' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => void togglePause()}
            >
              {row.status === 'ACTIVE' ? t('pause') : t('resume')}
            </Button>
          ) : null}
          <Button type="button" variant="danger" size="sm" onClick={() => void onDelete()}>
            {tc('delete')}
          </Button>
        </div>
      </div>

      <section className="grid gap-4 rounded-xl border border-s-border bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <span className="text-s-muted">{t('nextRun')}</span>
          <p className="font-semibold text-s-navy">
            {format(new Date(row.nextRunDate), 'dd MMMM yyyy', { locale: frLocale })}
          </p>
        </div>
        <div>
          <span className="text-s-muted">{t('startDate')}</span>
          <p className="font-semibold text-s-navy">
            {format(new Date(row.startDate), 'dd/MM/yyyy', { locale: frLocale })}
          </p>
        </div>
        <div>
          <span className="text-s-muted">{t('autoValidate')}</span>
          <p className="font-semibold text-s-navy">{row.autoValidate ? tc('yes') : tc('no')}</p>
        </div>
        <div>
          <span className="text-s-muted">{t('dueDaysAfter')}</span>
          <p className="font-semibold text-s-navy">
            {row.dueDaysAfter} {t('days')}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-s-border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-s-navy">{t('lines')}</h2>
        <ul className="space-y-2 text-sm">
          {row.lines.map((l, i) => (
            <li key={i} className="flex justify-between border-b border-s-border/40 py-2">
              <span>{l.description}</span>
              <span className="text-s-muted">
                {Number(l.quantity)} × {Number(l.unitPriceHt).toFixed(2)} HT · TVA{' '}
                {Number(l.taxRate)}%
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-s-border bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-s-navy">{t('history')}</h2>
        {row.generatedInvoices.length === 0 ? (
          <p className="text-sm text-s-muted">{t('noHistory')}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {row.generatedInvoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="font-medium text-[#1e3a8a] hover:underline"
                >
                  {inv.number ?? 'Brouillon'} — {format(new Date(inv.issueDate), 'dd/MM/yyyy')}
                </Link>
                <span className="ms-2 text-s-muted">
                  {Number(inv.totalTtc).toFixed(2)} {inv.currency}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
