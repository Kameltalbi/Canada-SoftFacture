import { PricingToggleCards } from '@/components/marketing/pricing-toggle-cards';
import { cn } from '@/lib/utils';
import { getPublicBillingPlans, planPricesHtFromBilling } from '@/lib/billing-api';
import { COMPARISON_BOOLEAN, COMPARISON_ROWS, PLAN_IDS } from '@/lib/pricing-plans';
import { Check, X, ShieldCheck, Clock, Globe, CreditCard } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

function CompareCell({ value, yesLabel, noLabel }: { value: boolean; yesLabel: string; noLabel: string }) {
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

        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{t('title')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">{t('subtitle')}</p>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-700">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            {t('trust.trial')}
          </span>
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            {t('trust.noCommitment')}
          </span>
          <span className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" />
            {t('trust.frenchSupport')}
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {t('trust.securePayment')}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            {t('trust.canadaHosting')}
          </span>
        </div>

        {/* Plan cards */}
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
            ctaByPlan: {
              starter: t('ctaStarter'),
              pro: t('ctaPro'),
              business: t('ctaBusiness'),
            },
            interacTooltip: t('interacTooltip'),
            plans: {
              starter: {
                name: t('plans.starter.name'),
                audience: t('plans.starter.audience'),
                highlights: {
                  users: t('plans.starter.highlights.users'),
                  clients: t('plans.starter.highlights.clients'),
                  invoices: t('plans.starter.highlights.invoices'),
                  pdf: t('plans.starter.highlights.pdf'),
                  taxes: t('plans.starter.highlights.taxes'),
                  support: t('plans.starter.highlights.support'),
                },
              },
              pro: {
                name: t('plans.pro.name'),
                audience: t('plans.pro.audience'),
                highlights: {
                  everything: t('plans.pro.highlights.everything'),
                  users: t('plans.pro.highlights.users'),
                  payments: t('plans.pro.highlights.payments'),
                  interac: t('plans.pro.highlights.interac'),
                  reminders: t('plans.pro.highlights.reminders'),
                  recurring: t('plans.pro.highlights.recurring'),
                  stock: t('plans.pro.highlights.stock'),
                  accountant: t('plans.pro.highlights.accountant'),
                },
              },
              business: {
                name: t('plans.business.name'),
                audience: t('plans.business.audience'),
                highlights: {
                  everything: t('plans.business.highlights.everything'),
                  users: t('plans.business.highlights.users'),
                  stockAdvanced: t('plans.business.highlights.stockAdvanced'),
                  signature: t('plans.business.highlights.signature'),
                  api: t('plans.business.highlights.api'),
                  multiCompany: t('plans.business.highlights.multiCompany'),
                  auditLog: t('plans.business.highlights.auditLog'),
                  support: t('plans.business.highlights.support'),
                },
              },
            },
          }}
        />

        {/* Tableau comparatif */}
        {showComparison && (
          <div className="mt-16 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">{t('compare.title')}</h3>
              <p className="mt-1 text-sm text-slate-500">{t('compare.subtitle')}</p>
            </div>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-900">{t('compare.feature')}</th>
                  {PLAN_IDS.map((planId) => (
                    <th
                      key={planId}
                      className={cn(
                        'px-4 py-3 font-semibold',
                        planId === 'pro' ? 'text-emerald-700' : 'text-slate-900'
                      )}
                    >
                      {t(`plans.${planId}.name`)}
                      {planId === 'pro' && (
                        <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          ★
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{t(`compare.rows.${row.key}`)}</td>
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

        {/* FAQ */}
        <div className="mt-20">
          <h3 className="text-center text-2xl font-bold text-slate-900">{t('faq.title')}</h3>
          <div className="mt-8 mx-auto max-w-3xl divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {(['cancel', 'hidden', 'hosting', 'taxes', 'import', 'upgrade'] as const).map((key) => (
              <details key={key} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-slate-800">
                  {t(`faq.${key}.q`)}
                  <span className="ml-4 shrink-0 text-emerald-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{t(`faq.${key}.a`)}</p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="mt-16 rounded-2xl bg-emerald-600 px-8 py-10 text-center text-white">
          <CreditCard className="mx-auto h-8 w-8 opacity-80" />
          <h3 className="mt-3 text-2xl font-bold">{t('finalCta.title')}</h3>
          <p className="mt-2 text-emerald-100">{t('finalCta.subtitle')}</p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-xl bg-white px-8 py-3 font-bold text-emerald-700 shadow hover:bg-emerald-50 transition"
          >
            {t('finalCta.cta')}
          </Link>
        </div>

      </div>
    </section>
  );
}
