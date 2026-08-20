export const PLAN_IDS = ['starter', 'pro', 'business'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Plan Gratuit illimité (slug technique `starter`, comme SoftFacture v2). */
export const FREE_PLAN_ID: PlanId = 'starter';

/** Plan payant mis en avant — Essentiel. */
export const HIGHLIGHTED_PLAN_ID: PlanId = 'pro';

export const PAID_PLAN_IDS = ['pro', 'business'] as const satisfies readonly PlanId[];

/** Annuel : 10 mois facturés, 2 mois offerts. */
export const YEARLY_MONTHS_CHARGED = 10;

/** Prix avant taxes affichés sur /tarifs — garder synchronisé avec backend/src/lib/billing/plans.ts */
export const PLAN_PRICES_HT_CAD: Record<PlanId, number> = {
  starter: 0,
  pro: 34.9,
  business: 59.9,
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
  return isPlanId(value) && !isFreePlan(value);
}

/** Inscription (visiteur) ou checkout (connecté, plans payants). */
export function planCtaHref(planId: PlanId, loggedIn = false): string {
  if (!loggedIn) return `/register?plan=${planId}`;
  return isFreePlan(planId) ? '/dashboard' : `/checkout?plan=${planId}`;
}

export function priceHtToTtc(htCad: number, vatRate = SUBSCRIPTION_VAT_RATE): number {
  return Math.round(htCad * (1 + vatRate / 100) * 100) / 100;
}

export function yearlyPriceHt(monthlyHt: number): number {
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
export const PLAN_HIGHLIGHT_KEYS: Record<PlanId, string[]> = {
  starter: ['clients', 'invoices', 'dashboard', 'payments', 'reminders', 'pdf', 'users'],
  pro: [
    'everything',
    'recurring',
    'deposits',
    'creditNotes',
    'payments',
    'reminders',
    'accountant',
    'users',
  ],
  business: [
    'everything',
    'stock',
    'stockAdvanced',
    'expenses',
    'users',
    'multiCompany',
    'support',
  ],
};

export type ComparisonRowType = 'text' | 'boolean';

export const COMPARISON_ROWS: { key: string; type: ComparisonRowType }[] = [
  { key: 'users', type: 'text' },
  { key: 'quotes', type: 'text' },
  { key: 'invoices', type: 'text' },
  { key: 'creditNotesDeposits', type: 'boolean' },
  { key: 'recurring', type: 'boolean' },
  { key: 'reminders', type: 'text' },
  { key: 'payments', type: 'text' },
  { key: 'accountingExport', type: 'text' },
  { key: 'accountantAccess', type: 'boolean' },
  { key: 'stock', type: 'text' },
  { key: 'pdfTemplates', type: 'text' },
  { key: 'dashboard', type: 'text' },
  { key: 'signature', type: 'boolean' },
  { key: 'multiCompany', type: 'text' },
  { key: 'api', type: 'boolean' },
  { key: 'expenses', type: 'boolean' },
  { key: 'support', type: 'text' },
];

export const COMPARISON_BOOLEAN: Record<string, Record<PlanId, boolean>> = {
  creditNotesDeposits: { starter: false, pro: true, business: true },
  recurring: { starter: false, pro: true, business: true },
  accountantAccess: { starter: false, pro: true, business: true },
  signature: { starter: false, pro: false, business: true },
  api: { starter: false, pro: false, business: true },
  expenses: { starter: false, pro: false, business: true },
};
