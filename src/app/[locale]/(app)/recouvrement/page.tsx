'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/format-money';
import { isProPlan } from '@/lib/plan-access';
import { RelanceDialog } from '@/components/recouvrement/relance-dialog';
import type { CollectibleInvoice } from '@/components/recouvrement/types';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'overdue' | 'upcoming' | 'reminded';
type RowStatus = 'overdue' | 'reminded' | 'due_soon' | 'upcoming';

const PAGE_SIZE = 10;
const DUE_SOON_DAYS = 7;

type InvoicesPayload = {
  invoices: CollectibleInvoice[];
  collectedThisMonth: number;
  collectedCount: number;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(invoice: CollectibleInvoice) {
  const due = invoice.dueDate || invoice.issueDate;
  if (!due) return 0;
  const dueDate = new Date(due);
  if (Number.isNaN(dueDate.getTime())) return 0;
  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  return Math.round((dueDay.getTime() - startOfToday().getTime()) / 86400000);
}

function rowStatus(invoice: CollectibleInvoice): RowStatus {
  const until = daysUntil(invoice);
  if (until < 0) return 'overdue';
  if (invoice.remindersCount > 0) return 'reminded';
  if (until <= DUE_SOON_DAYS) return 'due_soon';
  return 'upcoming';
}

export default function RecouvrementPage() {
  const t = useTranslations('recouvrement');
  const tc = useTranslations('common');
  const locale = useLocale();
  const toast = useToast();
  const { token, user } = useAuth();
  const canView = isProPlan(user?.organization?.subscriptionPlan);
  const dateLocale = locale === 'en' ? 'en-CA' : 'fr-CA';

  const [payload, setPayload] = useState<InvoicesPayload | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [relanceInvoice, setRelanceInvoice] = useState<CollectibleInvoice | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch<InvoicesPayload>('/payment-reminders/invoices');
    setPayload(data);
  }, []);

  useEffect(() => {
    if (!token || !canView) return;
    void load().catch((e: unknown) => {
      setPayload({ invoices: [], collectedThisMonth: 0, collectedCount: 0 });
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    });
  }, [token, canView, load, toast, tc]);

  const openInvoices = payload?.invoices ?? [];
  const overdueInvoices = openInvoices.filter((inv) => daysUntil(inv) < 0);
  const totalOutstanding = openInvoices.reduce((sum, inv) => sum + inv.remaining, 0);
  const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.remaining, 0);

  const filtered = useMemo(() => {
    const rows = openInvoices.filter((inv) => {
      const status = rowStatus(inv);
      if (statusFilter === 'overdue') return status === 'overdue';
      if (statusFilter === 'upcoming') return status === 'upcoming' || status === 'due_soon';
      if (statusFilter === 'reminded') return inv.remindersCount > 0;
      return true;
    });
    return rows.sort((a, b) => daysUntil(a) - daysUntil(b));
  }, [openInvoices, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const filters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'overdue', label: t('filterOverdue') },
    { value: 'upcoming', label: t('filterUpcoming') },
    { value: 'reminded', label: t('filterReminded') },
  ];

  if (!canView) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
        <h1 className="text-lg font-semibold text-amber-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-amber-800">{t('upgradeBody')}</p>
        <Link href="/checkout?plan=pro" className="mt-4 inline-block">
          <Button type="button">{t('upgradeCta')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight text-s-navy sm:text-3xl">{t('title')}</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
          <p className="text-sm text-slate-500">{t('toRecover')}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-s-navy">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {t(openInvoices.length <= 1 ? 'invoiceCount' : 'invoiceCountPlural', {
              count: openInvoices.length,
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
          <p className="text-sm text-slate-500">{t('overdueAmount')}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-red-700">
            {formatCurrency(totalOverdue)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {t(overdueInvoices.length <= 1 ? 'invoiceCount' : 'invoiceCountPlural', {
              count: overdueInvoices.length,
            })}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
          <p className="text-sm text-slate-500">{t('collected')}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-s-navy">
            {formatCurrency(payload?.collectedThisMonth ?? 0)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {t((payload?.collectedCount ?? 0) <= 1 ? 'invoiceCount' : 'invoiceCountPlural', {
              count: payload?.collectedCount ?? 0,
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={cn(
              '-mb-px px-3 py-2 text-sm transition-colors',
              statusFilter === filter.value
                ? 'border-b-2 border-brand font-medium text-s-navy'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {!payload ? (
          <div className="px-5 py-16 text-center text-slate-500">{tc('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">{t('client')}</th>
                  <th className="px-4 py-3 font-medium">{t('number')}</th>
                  <th className="px-4 py-3 font-medium">{t('dueDate')}</th>
                  <th className="px-4 py-3 font-medium">{t('amount')}</th>
                  <th className="px-4 py-3 font-medium">{t('status')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((invoice) => {
                  const until = daysUntil(invoice);
                  const status = rowStatus(invoice);
                  const styles: Record<RowStatus, string> = {
                    overdue: 'bg-red-50 text-red-700',
                    reminded: 'bg-slate-100 text-slate-700',
                    due_soon: 'bg-amber-50 text-amber-800',
                    upcoming: 'bg-slate-50 text-slate-600',
                  };
                  const labels: Record<RowStatus, string> = {
                    overdue: t('statusOverdue'),
                    reminded: t('statusReminded'),
                    due_soon: t('statusDueSoon'),
                    upcoming: t('statusUpcoming'),
                  };
                  return (
                    <tr key={invoice.id} className="border-b border-slate-50">
                      <td className="px-4 py-3 font-medium text-s-navy">{invoice.client.name}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium text-brand hover:underline"
                        >
                          {invoice.number || '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(invoice.dueDate || invoice.issueDate).toLocaleDateString(
                          dateLocale
                        )}
                        {until < 0 ? (
                          <p className="mt-0.5 text-xs text-red-600">
                            {t(until === -1 ? 'daysOverdue' : 'daysOverduePlural', {
                              count: -until,
                            })}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium text-s-navy">
                        {formatCurrency(invoice.remaining, invoice.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                            styles[status]
                          )}
                        >
                          {labels[status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRelanceInvoice(invoice)}
                          >
                            {t('remind')}
                          </Button>
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button size="sm">{t('pay')}</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      {t('noInvoicesFound')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <p className="text-sm text-slate-500">
              {t('pagination', {
                from: (currentPage - 1) * PAGE_SIZE + 1,
                to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-brand px-2 text-sm font-medium text-white">
                {currentPage}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <RelanceDialog
        invoice={relanceInvoice}
        companyName={user?.organization?.name || t('defaultCompany')}
        open={!!relanceInvoice}
        onClose={() => setRelanceInvoice(null)}
        onSaved={load}
      />
    </div>
  );
}
