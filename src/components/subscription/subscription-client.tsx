'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PricingPlanCards } from '@/components/marketing/pricing-plan-cards';
import { createBillingPortalSession, fetchBillingSubscription } from '@/lib/billing-api';
import type { BillingPlansResponse } from '@/lib/billing-api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { PlanId } from '@/lib/pricing-plans';
import { Link } from '@/i18n/navigation';

export function SubscriptionClient({ initialBilling }: { initialBilling?: BillingPlansResponse }) {
  const t = useTranslations('subscription');
  const [currentPlanId, setCurrentPlanId] = useState<PlanId | null>(null);
  const [billingStatus, setBillingStatus] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [canManageBilling, setCanManageBilling] = useState(false);
  const [portalPending, setPortalPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    void fetchBillingSubscription()
      .then((sub) => {
        setCurrentPlanId(sub.plan);
        setBillingStatus(sub.billingStatus);
        setTrialEndsAt(sub.trialEndsAt);
        setCanManageBilling(Boolean(sub.canManageBilling));
      })
      .catch(() => setCurrentPlanId(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-s-navy">{t('title')}</h1>
        <p className="text-s-muted">{t('subtitle')}</p>
      </div>

      {billingStatus === 'TRIAL' && trialEndsAt ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t('trialActive', {
            date: new Date(trialEndsAt).toLocaleDateString('fr-FR'),
          })}
        </p>
      ) : billingStatus === 'ACTIVE' ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t('activeSubscription')}
        </p>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {t('checkoutHint')}{' '}
          <Link href="/tarifs" className="font-medium text-brand underline">
            {t('viewPricing')}
          </Link>
        </p>
      )}

      {canManageBilling ? (
        <div>
          <Button
            type="button"
            variant="secondary"
            disabled={portalPending}
            onClick={() => {
              setPortalPending(true);
              void createBillingPortalSession()
                .then((r) => {
                  window.location.href = r.url;
                })
                .catch((e: unknown) => {
                  toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
                  setPortalPending(false);
                });
            }}
          >
            {portalPending ? '…' : t('manageBilling')}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-s-muted">…</p>
      ) : (
        <PricingPlanCards currentPlanId={currentPlanId} initialBilling={initialBilling} />
      )}

      <p className="text-center text-xs text-s-muted">{t('billingNote')}</p>
    </div>
  );
}
