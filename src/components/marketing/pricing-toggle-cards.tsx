'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { PricingCta } from '@/components/marketing/pricing-cta';
import { cn } from '@/lib/utils';
import { formatEur, HIGHLIGHTED_PLAN_ID, PLAN_HIGHLIGHT_KEYS, PLAN_IDS } from '@/lib/pricing-plans';
import type { PlanId } from '@/lib/pricing-plans';

type BillingCycle = 'monthly' | 'yearly';

export function PricingToggleCards({
  planPrices,
  labels,
}: {
  planPrices: Record<PlanId, number>;
  labels: {
    monthly: string;
    yearly: string;
    yearlyBadge: string;
    yearlyNote: string;
    perMonth: string;
    perYear: string;
    billedYearly: string;
    trialBadge: string;
    popularBadge: string;
    cta: string;
    plans: Record<PlanId, { name: string; audience: string; highlights: Record<string, string> }>;
  };
}) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const yearly = cycle === 'yearly';

  return (
    <>
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              !yearly ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}
            onClick={() => setCycle('monthly')}
          >
            {labels.monthly}
          </button>
          <button
            type="button"
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              yearly ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}
            onClick={() => setCycle('yearly')}
          >
            {labels.yearly}
          </button>
        </div>
        <p className="text-sm font-medium text-emerald-700">{labels.yearlyBadge}</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {PLAN_IDS.map((planId) => {
          const highlighted = planId === HIGHLIGHTED_PLAN_ID;
          const monthlyPrice = planPrices[planId];
          const displayedPrice = yearly ? monthlyPrice * 10 : monthlyPrice;
          const priceFormatted = formatEur(displayedPrice);

          return (
            <div
              key={planId}
              className={cn(
                'relative flex flex-col rounded-2xl border-2 bg-white p-7',
                highlighted ? 'border-emerald-600 shadow-lg' : 'border-slate-200'
              )}
            >
              {highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold uppercase text-white">
                  {labels.popularBadge}
                </span>
              )}
              <h3 className="text-xl font-bold">{labels.plans[planId].name}</h3>
              <p className="mt-1 text-sm text-slate-600">{labels.plans[planId].audience}</p>
              <p className="mt-4 text-3xl font-bold">
                {priceFormatted} € <span className="text-lg font-semibold text-slate-600">HT</span>
                <span className="text-base font-normal text-slate-500">
                  {yearly ? labels.perYear : labels.perMonth}
                </span>
              </p>
              {yearly ? (
                <p className="mt-2 text-xs font-medium text-emerald-700">{labels.billedYearly}</p>
              ) : (
                <p className="mt-2 text-xs font-medium text-emerald-700">{labels.trialBadge}</p>
              )}
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-700">
                {PLAN_HIGHLIGHT_KEYS[planId].map((key) => (
                  <li key={key} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <span>{labels.plans[planId].highlights[key]}</span>
                  </li>
                ))}
              </ul>
              <PricingCta label={labels.cta} highlighted={highlighted} planId={planId} />
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">{labels.yearlyNote}</p>
    </>
  );
}
