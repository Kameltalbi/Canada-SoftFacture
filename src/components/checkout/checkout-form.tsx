'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { formatEur, isPlanId, PLAN_IDS, type PlanId } from '@/lib/pricing-plans';
import {
  createBillingCheckout,
  fetchBillingSubscription,
  planQuoteFromBilling,
  type BillingPlansResponse,
} from '@/lib/billing-api';
import { usePublicBillingPlans } from '@/hooks/use-public-billing-plans';
import { Check, Lock, Shield } from 'lucide-react';

type Props = {
  initialPlan: PlanId;
  initialBilling?: BillingPlansResponse;
};

export function CheckoutForm({ initialPlan, initialBilling }: Props) {
  const t = useTranslations('checkout');
  const tc = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const { status, user } = useAuth();

  const [plan, setPlan] = useState<PlanId>(initialPlan);
  const [billingLegalName, setBillingLegalName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingSiret, setBillingSiret] = useState('');
  const [billingVatNumber, setBillingVatNumber] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptWithdrawal, setAcceptWithdrawal] = useState(false);
  const [pending, setPending] = useState(false);

  const { billing, planPrices, trialDays } = usePublicBillingPlans(initialBilling);
  const quote = planQuoteFromBilling(billing, plan);
  const vatAmount = Math.round((quote.priceTtcEur - quote.priceHtEur) * 100) / 100;

  const isAuthenticated = status === 'authenticated' && user;

  useEffect(() => {
    if (!isAuthenticated) return;
    setBillingEmail((e) => e || user.email);
    setBillingLegalName((n) => n || user.organization?.name || user.name || '');
    void fetchBillingSubscription()
      .then((sub) => {
        if (sub.billingLegalName) setBillingLegalName(sub.billingLegalName);
        if (sub.billingEmail) setBillingEmail(sub.billingEmail);
        if (sub.billingSiret) setBillingSiret(sub.billingSiret);
        if (sub.billingVatNumber) setBillingVatNumber(sub.billingVatNumber);
      })
      .catch(() => {});
  }, [isAuthenticated, user]);

  const loginHref = useMemo(() => {
    const returnTo = encodeURIComponent(`/checkout?plan=${plan}`);
    return `/login?returnUrl=${returnTo}`;
  }, [plan]);

  const registerHref = useMemo(() => `/register?plan=${plan}`, [plan]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.push(t('authRequired'), 'error');
      return;
    }
    if (!acceptTerms || !acceptWithdrawal) {
      toast.push(t('acceptRequired'), 'error');
      return;
    }
    setPending(true);
    try {
      const res = await createBillingCheckout({
        plan,
        billingLegalName: billingLegalName.trim(),
        billingEmail: billingEmail.trim(),
        billingSiret: billingSiret.trim() || null,
        billingVatNumber: billingVatNumber.trim() || null,
        acceptTerms: true,
      });
      if (res.mode === 'redirect' && res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      router.push(`/checkout/success?session_id=${res.sessionId}&mode=pending`);
    } catch (er: unknown) {
      toast.push(er instanceof Error ? er.message : tc('error'), 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-5 lg:gap-12">
      <div className="lg:col-span-3">
        <Card className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-s-navy">{t('title')}</h1>
          <p className="mt-1 text-sm text-s-muted">{t('subtitle')}</p>

          {!isAuthenticated ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-medium">{t('authRequired')}</p>
              <p className="mt-2 text-amber-900">{t('authRequiredHint')}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={loginHref}>
                  <Button variant="primary">{t('login')}</Button>
                </Link>
                <Link href={registerHref}>
                  <Button variant="secondary">{t('createAccount')}</Button>
                </Link>
              </div>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-s-muted">{t('plan')}</label>
              <select
                value={plan}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isPlanId(v)) setPlan(v);
                }}
                className="w-full rounded-xl border border-s-border bg-white px-4 py-2.5 text-sm"
              >
                {PLAN_IDS.map((p) => (
                  <option key={p} value={p}>
                    {t(`plan_${p}`)} — {formatEur(planPrices[p])} € HT/mois
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-s-muted">
                {t('legalName')} *
              </label>
              <Input
                value={billingLegalName}
                onChange={(e) => setBillingLegalName(e.target.value)}
                required
                disabled={!isAuthenticated}
                placeholder={t('legalNamePlaceholder')}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-s-muted">
                {t('billingEmail')} *
              </label>
              <Input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                required
                disabled={!isAuthenticated}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-s-muted">{t('siret')}</label>
                <Input
                  value={billingSiret}
                  onChange={(e) => setBillingSiret(e.target.value)}
                  disabled={!isAuthenticated}
                  placeholder="12345678901234"
                  maxLength={17}
                />
                <p className="mt-1 text-[10px] text-s-muted">{t('siretHint')}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-s-muted">{t('vat')}</label>
                <Input
                  value={billingVatNumber}
                  onChange={(e) => setBillingVatNumber(e.target.value)}
                  disabled={!isAuthenticated}
                  placeholder="FR12345678901"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-s-border bg-slate-50 p-4 text-sm">
              <label className="flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  disabled={!isAuthenticated}
                  className="mt-1 shrink-0"
                />
                <span>
                  {t('acceptTermsPrefix')}{' '}
                  <Link
                    href="/cgv"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-700 underline"
                  >
                    {t('acceptTermsLink')}
                  </Link>{' '}
                  {t('acceptTermsSuffix')}{' '}
                  <Link
                    href="/mentions-legales"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-700 underline"
                  >
                    {t('acceptMentionsLink')}
                  </Link>
                  ,{' '}
                  <Link
                    href="/politique-de-confidentialite"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-700 underline"
                  >
                    {t('acceptPrivacyLink')}
                  </Link>{' '}
                  {t('acceptTermsEnd')}
                </span>
              </label>
              <label className="flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={acceptWithdrawal}
                  onChange={(e) => setAcceptWithdrawal(e.target.checked)}
                  disabled={!isAuthenticated}
                  className="mt-1"
                />
                <span>{t('acceptWithdrawal')}</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={!isAuthenticated || pending}
            >
              {pending ? '…' : t('payCta')}
            </Button>

            <p className="flex items-center justify-center gap-2 text-center text-xs text-s-muted">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              {t('securePayment')}
            </p>
          </form>
        </Card>
      </div>

      <aside className="lg:col-span-2">
        <Card className="sticky top-24 p-6">
          <h2 className="text-lg font-semibold text-s-navy">{t('summaryTitle')}</h2>
          <p className="mt-1 text-sm text-s-muted">{t(`plan_${plan}`)}</p>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-s-muted">{t('priceHt')}</dt>
              <dd>{formatEur(quote.priceHtEur)} €</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-s-muted">
                {t('vat')} ({quote.vatRatePercent} %)
              </dt>
              <dd>{formatEur(vatAmount)} €</dd>
            </div>
            <div className="flex justify-between border-t border-s-border pt-2 text-base font-bold">
              <dt>{t('priceTtc')}</dt>
              <dd>
                {formatEur(quote.priceTtcEur)} € TTC / {t('perMonth')}
              </dd>
            </div>
            <p className="text-[10px] text-s-muted">{t('htNote')}</p>
          </dl>
          <ul className="mt-6 space-y-2 text-sm text-slate-700">
            <li className="flex gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              {t('trialIncluded', { days: trialDays })}
            </li>
            <li className="flex gap-2">
              <Shield className="h-4 w-4 shrink-0 text-emerald-600" />
              {t('franceCompliance')}
            </li>
          </ul>
          <p className="mt-6 text-[10px] leading-relaxed text-s-muted">{t('legalFootnote')}</p>
        </Card>
      </aside>
    </div>
  );
}
