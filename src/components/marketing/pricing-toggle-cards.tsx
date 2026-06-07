'use client';

import { useState } from 'react';
import { Check, Info } from 'lucide-react';
import { PricingCta } from '@/components/marketing/pricing-cta';
import { cn } from '@/lib/utils';
import { formatCad, HIGHLIGHTED_PLAN_ID, PLAN_HIGHLIGHT_KEYS, PLAN_IDS } from '@/lib/pricing-plans';
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
    ctaByPlan?: Partial<Record<PlanId, string>>;
    interacTooltip: string;
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
          const yearlyPrice = Math.round(monthlyPrice * 10 * 100) / 100;
          const displayedPrice = yearly ? yearlyPrice : monthlyPrice;
          const priceFormatted = formatCad(displayedPrice);

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
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{priceFormatted}</span>
                <span className="text-lg font-semibold text-slate-500">CAD</span>
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
                  <li key={key} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <span className="flex items-center gap-1">
                      {labels.plans[planId].highlights[key]}
                      {key === 'interac' && (
                        <span
                          className="group relative cursor-help"
                          title={labels.interacTooltip}
                        >
                          <Info className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600" />
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <PricingCta
                label={labels.ctaByPlan?.[planId] ?? labels.cta}
                highlighted={highlighted}
                planId={planId}
              />
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-slate-600">{labels.yearlyNote}</p>
    </>
  );
}
