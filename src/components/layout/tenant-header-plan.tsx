'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { planFromApi } from '@/lib/pdf-plan-config';
import type { ApiOrganization } from '@/contexts/auth-context';

export function TenantHeaderPlan({ organization }: { organization?: ApiOrganization | null }) {
  const t = useTranslations('nav');
  const tp = useTranslations('pricing');
  const locale = useLocale();

  if (!organization?.subscriptionPlan) return null;

  const planId = planFromApi(organization.subscriptionPlan);
  const planName = tp(`plans.${planId}.name`);
  const billingStatus = organization.billingStatus;
  const trialEndsAt = organization.trialEndsAt;

  let trialLabel: string | null = null;
  if (billingStatus === 'TRIAL' && trialEndsAt) {
    const date = new Date(trialEndsAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    trialLabel = t('headerTrialUntil', { date });
  }

  return (
    <Link
      href="/subscription"
      className="hidden min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50/80 hover:text-emerald-800 md:inline-flex"
      title={t('headerPlanManage')}
    >
      <span className="truncate">{planName}</span>
      {trialLabel ? (
        <>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <span className="shrink-0 text-emerald-700">{trialLabel}</span>
        </>
      ) : null}
    </Link>
  );
}
