export const PLAN_IDS = ['starter', 'pro', 'business'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const HIGHLIGHTED_PLAN_ID: PlanId = 'pro';

/** Prix avant taxes affichés sur /tarifs — garder synchronisé avec backend/src/lib/billing/plans.ts */
export const PLAN_PRICES_HT_CAD: Record<PlanId, number> = {
  starter: 10.9,
  pro: 17.9,
  business: 24.9,
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

export function priceHtToTtc(htCad: number, vatRate = SUBSCRIPTION_VAT_RATE): number {
  return Math.round(htCad * (1 + vatRate / 100) * 100) / 100;
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
  starter: ['users', 'quotes', 'invoices', 'clients', 'pdf', 'support'],
  pro: ['users', 'quotes', 'invoices', 'reminders', 'payments', 'recurring', 'stock', 'accountant'],
  business: [
    'users',
    'quotes',
    'invoices',
    'companies',
    'signature',
    'api',
    'stockAdvanced',
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
  creditNotesDeposits: { starter: true, pro: true, business: true },
  recurring: { starter: false, pro: true, business: true },
  accountantAccess: { starter: false, pro: true, business: true },
  signature: { starter: false, pro: false, business: true },
  api: { starter: false, pro: false, business: true },
  expenses: { starter: false, pro: false, business: true },
};
