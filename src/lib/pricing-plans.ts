export const PLAN_IDS = ['starter', 'pro', 'business'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Plans affichés sur /tarifs (Business fusionné dans Pro). */
export const PUBLIC_PLAN_IDS = ['starter', 'pro'] as const satisfies readonly PlanId[];

/** Plan Gratuit illimité (slug technique `starter`). */
export const FREE_PLAN_ID: PlanId = 'starter';

/** Plan payant mis en avant — Pro. */
export const HIGHLIGHTED_PLAN_ID: PlanId = 'pro';

/** Checkout : seul Pro est vendu (Business legacy → traité comme Pro). */
export const PAID_PLAN_IDS = ['pro'] as const satisfies readonly PlanId[];

/** Annuel Pro = 99 $ ≈ 10 mois (2 mois offerts). */
export const YEARLY_MONTHS_CHARGED = 10;

/** Prix avant taxes mensuels — sync backend/src/lib/billing/plans.ts */
export const PLAN_PRICES_HT_CAD: Record<PlanId, number> = {
  starter: 0,
  pro: 9.99,
  /** Legacy : même tarif que Pro (fusion commerciale). */
  business: 9.99,
};

/** Prix annuels HT CAD (fixes). */
export const PLAN_YEARLY_PRICES_HT_CAD: Record<PlanId, number> = {
  starter: 0,
  pro: 99,
  business: 99,
};

/** @deprecated Utiliser PLAN_PRICES_HT_CAD */
export const PLAN_PRICES_HT_EUR = PLAN_PRICES_HT_CAD;
/** @deprecated Utiliser PLAN_PRICES_HT_CAD */
export const PLAN_PRICES_EUR = PLAN_PRICES_HT_CAD;

/** TPS fédérale canadienne sur abonnements SaaS (5 %). */
export const SUBSCRIPTION_VAT_RATE = 5;

export const TRIAL_DAYS = 30;

export const PLAN_TO_SUBSCRIPTION_API: Record<PlanId, 'STARTER' | 'PRO' | 'BUSINESS'> = {
  starter: 'STARTER',
  pro: 'PRO',
  business: 'BUSINESS',
};

export const SUBSCRIPTION_API_TO_PLAN: Record<'STARTER' | 'PRO' | 'BUSINESS', PlanId> = {
  STARTER: 'starter',
  PRO: 'pro',
  BUSINESS: 'business',
};

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === 'starter' || value === 'pro' || value === 'business';
}

export function isFreePlan(value: string | null | undefined): boolean {
  return value === FREE_PLAN_ID;
}

export function isPaidPlan(value: string | null | undefined): boolean {
  return value === 'pro' || value === 'business';
}

/** Normalise business → pro pour l’UI commerciale. */
export function toPublicPlanId(planId: PlanId): 'starter' | 'pro' {
  return planId === 'starter' ? 'starter' : 'pro';
}

/** Inscription (visiteur) ou checkout (connecté, plans payants). */
export function planCtaHref(planId: PlanId, loggedIn = false, yearly = false): string {
  const publicId = toPublicPlanId(planId);
  if (!loggedIn) {
    const cycle = yearly && publicId === 'pro' ? '&cycle=yearly' : '';
    return `/register?plan=${publicId}${cycle}`;
  }
  if (isFreePlan(publicId)) return '/dashboard';
  return yearly ? `/checkout?plan=pro&cycle=yearly` : `/checkout?plan=pro`;
}

export function priceHtToTtc(htCad: number, vatRate = SUBSCRIPTION_VAT_RATE): number {
  return Math.round(htCad * (1 + vatRate / 100) * 100) / 100;
}

export function yearlyPriceHt(monthlyHt: number, planId?: PlanId): number {
  if (planId) return PLAN_YEARLY_PRICES_HT_CAD[planId];
  if (monthlyHt <= 0) return 0;
  if (Math.abs(monthlyHt - 9.99) < 0.001) return 99;
  return Math.round(monthlyHt * YEARLY_MONTHS_CHARGED * 100) / 100;
}

export function formatCad(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** @deprecated Utiliser formatCad */
export function formatEur(amount: number): string {
  return formatCad(amount);
}

/** Keys for plan card bullet highlights (i18n: pricing.plans.{id}.highlights.{key}) */
export const PLAN_HIGHLIGHT_KEYS: Record<'starter' | 'pro', string[]> = {
  starter: [
    'clients',
    'quotes',
    'invoices',
    'products',
    'pdf',
    'taxes',
    'deposits',
    'creditNotes',
    'payments',
    'dashboard',
    'export',
    'users',
  ],
  pro: ['everything', 'recurring', 'users', 'pdfAdvanced', 'stock', 'support'],
};

export type ComparisonRowType = 'text' | 'boolean';

export const COMPARISON_ROWS: { key: string; type: ComparisonRowType }[] = [
  { key: 'users', type: 'text' },
  { key: 'quotes', type: 'text' },
  { key: 'invoices', type: 'text' },
  { key: 'creditNotesDeposits', type: 'boolean' },
  { key: 'recurring', type: 'boolean' },
  { key: 'payments', type: 'text' },
  { key: 'pdfTemplates', type: 'text' },
  { key: 'stock', type: 'text' },
  { key: 'dashboard', type: 'text' },
  { key: 'support', type: 'text' },
];

export const COMPARISON_BOOLEAN: Record<string, Record<'starter' | 'pro', boolean>> = {
  creditNotesDeposits: { starter: true, pro: true },
  recurring: { starter: false, pro: true },
};
