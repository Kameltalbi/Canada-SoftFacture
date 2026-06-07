'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { PricingPlanActions } from '@/components/marketing/pricing-plan-actions';
import { cn } from '@/lib/utils';
import { formatEur, HIGHLIGHTED_PLAN_ID, PLAN_HIGHLIGHT_KEYS, PLAN_IDS } from '@/lib/pricing-plans';
import type { PlanId } from '@/lib/pricing-plans';
import type { BillingPlansResponse } from '@/lib/billing-api';
import { usePublicBillingPlans } from '@/hooks/use-public-billing-plans';

export function PricingPlanCards({
  currentPlanId,
  initialBilling,
}: {
  currentPlanId?: PlanId | null;
  initialBilling?: BillingPlansResponse;
}) {
  const t = useTranslations('pricing');
  const { planPrices, loading } = usePublicBillingPlans(initialBilling);

  if (loading && !initialBilling) {
    return <p className="text-sm text-s-muted">…</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {PLAN_IDS.map((planId) => {
        const highlighted = planId === HIGHLIGHTED_PLAN_ID;
        const isCurrent = currentPlanId === planId;
        const priceFormatted = formatEur(planPrices[planId]);

        return (
          <div
            key={planId}
            className={cn(
              'relative flex flex-col rounded-2xl border-2 bg-white p-6',
              isCurrent
                ? 'border-s-navy ring-2 ring-s-navy/20'
                : highlighted
                  ? 'border-emerald-600'
                  : 'border-slate-200'
            )}
          >
            {isCurrent && (
              <span className="absolute -top-3 left-4 rounded-full bg-s-navy px-3 py-1 text-[10px] font-bold uppercase text-white">
                {t('currentPlan')}
              </span>
            )}
            {!isCurrent && highlighted && (
              <span className="absolute -top-3 right-4 rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold uppercase text-white">
                {t('popularBadge')}
              </span>
            )}
            <h3 className="text-lg font-bold">{t(`plans.${planId}.name`)}</h3>
            <p className="mt-4 text-2xl font-bold">
              {priceFormatted} € <span className="text-sm font-semibold text-slate-600">HT</span>
              <span className="text-sm font-normal text-slate-500">{t('perMonth')}</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {PLAN_HIGHLIGHT_KEYS[planId].slice(0, 4).map((key) => (
                <li key={key} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  {t(`plans.${planId}.highlights.${key}`)}
                </li>
              ))}
            </ul>
            <PricingPlanActions
              planId={planId}
              isCurrent={isCurrent}
              chooseLabel={t('choosePlan')}
              currentLabel={t('currentPlanCta')}
              highlighted={highlighted}
            />
          </div>
        );
      })}
    </div>
  );
}
