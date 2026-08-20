import type { SubscriptionPlan } from '../../generated/prisma/index.js';
import { APP_BRAND } from '../appBrand.js';
import { isStripeEnabled } from './stripeClient.js';

export type BillingPlanSlug = 'starter' | 'pro' | 'business';

export const BILLING_PLAN_SLUGS: BillingPlanSlug[] = ['starter', 'pro', 'business'];

const SLUG_TO_PLAN: Record<BillingPlanSlug, SubscriptionPlan> = {
  starter: 'STARTER',
  pro: 'PRO',
  business: 'BUSINESS',
};

const PLAN_TO_SLUG: Record<SubscriptionPlan, BillingPlanSlug> = {
  STARTER: 'starter',
  PRO: 'pro',
  BUSINESS: 'business',
};

/**
 * Prix avant TPS mensuels — identiques à `src/lib/pricing-plans.ts` PLAN_PRICES_HT_CAD (page /tarifs).
 * STARTER = plan Gratuit illimité (0 $).
 */
export const PLAN_PRICE_HT_CAD: Record<SubscriptionPlan, number> = {
  STARTER: 0,
  PRO: 34.9,
  BUSINESS: 59.9,
};

/** @deprecated Utiliser PLAN_PRICE_HT_CAD */
export const PLAN_PRICE_HT_EUR = PLAN_PRICE_HT_CAD;
/** @deprecated Utiliser PLAN_PRICE_HT_CAD */
export const PLAN_PRICE_TTC_EUR = PLAN_PRICE_HT_CAD;

/** Libellés produit Stripe (marché canadien). */
export const PLAN_STRIPE_LABELS: Record<SubscriptionPlan, string> = {
  STARTER: `${APP_BRAND} Gratuit`,
  PRO: `${APP_BRAND} Essentiel`,
  BUSINESS: `${APP_BRAND} Business`,
};

export function isPaidSubscriptionPlan(plan: SubscriptionPlan): boolean {
  return PLAN_PRICE_HT_CAD[plan] > 0;
}

export type BillingInterval = 'month' | 'year';

/** Annuel : 10 mois facturés, 2 mois offerts — identique à l'affichage /tarifs. */
export const YEARLY_MONTHS_CHARGED = 10;

export function yearlyPriceHtCad(monthlyHt: number): number {
  return Math.round(monthlyHt * YEARLY_MONTHS_CHARGED * 100) / 100;
}

/** TPS fédérale canadienne sur abonnements SaaS (5 %). */
export const SUBSCRIPTION_VAT_RATE_PERCENT = 5;
export const TRIAL_DAYS = 30;

export function slugToSubscriptionPlan(slug: string): SubscriptionPlan | null {
  if (slug === 'starter' || slug === 'pro' || slug === 'business') {
    return SLUG_TO_PLAN[slug];
  }
  return null;
}

export function subscriptionPlanToSlug(plan: SubscriptionPlan): BillingPlanSlug {
  return PLAN_TO_SLUG[plan];
}

export function priceHtToTtcCad(ht: number): number {
  return Math.round(ht * (1 + SUBSCRIPTION_VAT_RATE_PERCENT / 100) * 100) / 100;
}

/** @deprecated Utiliser priceHtToTtcCad */
export function priceHtToTtcEur(ht: number): number {
  return priceHtToTtcCad(ht);
}

export function priceHtToCents(ht: number): number {
  return Math.round(ht * 100);
}

export function priceTtcToCents(ttc: number): number {
  return Math.round(ttc * 100);
}

export function stripePriceIdForPlan(
  plan: SubscriptionPlan,
  interval: BillingInterval = 'month'
): string | undefined {
  if (plan === 'STARTER') return undefined;
  const key =
    plan === 'PRO'
      ? interval === 'year'
        ? 'STRIPE_PRICE_PRO_YEARLY'
        : 'STRIPE_PRICE_PRO'
      : interval === 'year'
        ? 'STRIPE_PRICE_BUSINESS_YEARLY'
        : 'STRIPE_PRICE_BUSINESS';
  const id = process.env[key]?.trim();
  return id || undefined;
}

export function planFromStripePriceId(priceId: string): SubscriptionPlan | null {
  const map: Array<[string | undefined, SubscriptionPlan]> = [
    [process.env.STRIPE_PRICE_PRO?.trim(), 'PRO'],
    [process.env.STRIPE_PRICE_PRO_YEARLY?.trim(), 'PRO'],
    [process.env.STRIPE_PRICE_BUSINESS?.trim(), 'BUSINESS'],
    [process.env.STRIPE_PRICE_BUSINESS_YEARLY?.trim(), 'BUSINESS'],
  ];
  for (const [id, plan] of map) {
    if (id && id === priceId) return plan;
  }
  return null;
}

/** Stripe actif dès que la clé secrète est présente (montants = page /tarifs). */
export function isStripeCheckoutReady(): boolean {
  return isStripeEnabled();
}

/** Montant unitaire Stripe en centimes (avant taxes — TPS/TVQ via Stripe Tax si activé). */
export function stripeLineItemAmountCents(
  plan: SubscriptionPlan,
  interval: BillingInterval = 'month'
): number {
  const monthly = PLAN_PRICE_HT_CAD[plan];
  const ht = interval === 'year' ? yearlyPriceHtCad(monthly) : monthly;
  return priceHtToCents(ht);
}

export function isStripeAutomaticTaxEnabled(): boolean {
  return process.env.STRIPE_AUTOMATIC_TAX !== 'false';
}

export function getFrontendBaseUrl(): string {
  const base = (
    process.env.FRONTEND_URL ??
    process.env.CORS_ORIGIN?.split(',')[0] ??
    'http://localhost:3000'
  ).trim();
  return base.replace(/\/$/, '');
}
