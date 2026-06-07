import { PricingToggleCards } from '@/components/marketing/pricing-toggle-cards';
import { cn } from '@/lib/utils';
import { getPublicBillingPlans, planPricesHtFromBilling } from '@/lib/billing-api';
import { COMPARISON_BOOLEAN, COMPARISON_ROWS, PLAN_IDS } from '@/lib/pricing-plans';
import { Check, X } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

function CompareCell({
  value,
  yesLabel,
  noLabel,
}: {
  value: boolean;
  yesLabel: string;
  noLabel: string;
}) {
  return value ? (
    <span className="inline-flex items-center gap-1 text-emerald-700">
      <Check className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">{yesLabel}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <X className="h-4 w-4 shrink-0" aria-hidden />
      <span className="sr-only">{noLabel}</span>
    </span>
  );
}

export async function PricingSection({
  className,
  showComparison = true,
}: {
  className?: string;
  showComparison?: boolean;
}) {
  const t = await getTranslations('pricing');
  const billing = await getPublicBillingPlans();
  const planPrices = planPricesHtFromBilling(billing);

  return (
    <section id="pricing" className={cn('py-14 md:py-16', className)}>
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">{t('subtitle')}</p>
          <p className="mt-2 text-sm font-medium text-emerald-700">{t('noCrmNote')}</p>
        </div>

        <PricingToggleCards
          planPrices={planPrices}
          labels={{
            monthly: t('billingToggle.monthly'),
            yearly: t('billingToggle.yearly'),
            yearlyBadge: t('billingToggle.yearlyBadge'),
            yearlyNote: t('billingToggle.yearlyNote'),
            perMonth: t('perMonth'),
            perYear: t('perYear'),
            billedYearly: t('billedYearly'),
            trialBadge: t('trialBadge'),
            popularBadge: t('popularBadge'),
            cta: t('cta'),
            plans: {
              starter: {
                name: t('plans.starter.name'),
                audience: t('plans.starter.audience'),
                highlights: {
                  users: t('plans.starter.highlights.users'),
                  quotes: t('plans.starter.highlights.quotes'),
                  invoices: t('plans.starter.highlights.invoices'),
                  clients: t('plans.starter.highlights.clients'),
                  pdf: t('plans.starter.highlights.pdf'),
                  support: t('plans.starter.highlights.support'),
                },
              },
              pro: {
                name: t('plans.pro.name'),
                audience: t('plans.pro.audience'),
                highlights: {
                  users: t('plans.pro.highlights.users'),
                  quotes: t('plans.pro.highlights.quotes'),
                  invoices: t('plans.pro.highlights.invoices'),
                  reminders: t('plans.pro.highlights.reminders'),
                  payments: t('plans.pro.highlights.payments'),
                  recurring: t('plans.pro.highlights.recurring'),
                  stock: t('plans.pro.highlights.stock'),
                  accountant: t('plans.pro.highlights.accountant'),
                },
              },
              business: {
                name: t('plans.business.name'),
                audience: t('plans.business.audience'),
                highlights: {
                  users: t('plans.business.highlights.users'),
                  quotes: t('plans.business.highlights.quotes'),
                  invoices: t('plans.business.highlights.invoices'),
                  companies: t('plans.business.highlights.companies'),
                  signature: t('plans.business.highlights.signature'),
                  api: t('plans.business.highlights.api'),
                  stockAdvanced: t('plans.business.highlights.stockAdvanced'),
                  support: t('plans.business.highlights.support'),
                },
              },
            },
          }}
        />

        {showComparison && (
          <div className="mt-16 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-900">{t('compare.feature')}</th>
                  {PLAN_IDS.map((planId) => (
                    <th key={planId} className="px-4 py-3 font-semibold text-slate-900">
                      {t(`plans.${planId}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {t(`compare.rows.${row.key}`)}
                    </td>
                    {PLAN_IDS.map((planId) => (
                      <td key={planId} className="px-4 py-3 text-slate-600">
                        {row.type === 'boolean' ? (
                          <CompareCell
                            value={COMPARISON_BOOLEAN[row.key][planId]}
                            yesLabel={t('compare.yes')}
                            noLabel={t('compare.no')}
                          />
                        ) : (
                          t(`compare.cells.${planId}.${row.key}`)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">{t('footnote')}</p>
      </div>
    </section>
  );
}
