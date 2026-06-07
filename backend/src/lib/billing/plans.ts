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
 * Prix HT mensuels — identiques à `src/lib/pricing-plans.ts` PLAN_PRICES_HT_EUR (page /tarifs).
 */
export const PLAN_PRICE_HT_EUR: Record<SubscriptionPlan, number> = {
  STARTER: 7.9,
  PRO: 12.9,
  BUSINESS: 17.9,
};

/** @deprecated Utiliser PLAN_PRICE_HT_EUR */
export const PLAN_PRICE_TTC_EUR = PLAN_PRICE_HT_EUR;

/** Libellés produit Stripe (marque SoftFacture France, éditeur Nexiora). */
export const PLAN_STRIPE_LABELS: Record<SubscriptionPlan, string> = {
  STARTER: `${APP_BRAND} Starter (Nexiora)`,
  PRO: `${APP_BRAND} Pro (Nexiora)`,
  BUSINESS: `${APP_BRAND} Business (Nexiora)`,
};

export const SUBSCRIPTION_VAT_RATE_PERCENT = 20;
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

export function priceHtToTtcEur(ht: number): number {
  return Math.round(ht * (1 + SUBSCRIPTION_VAT_RATE_PERCENT / 100) * 100) / 100;
}

export function priceHtToCents(ht: number): number {
  return Math.round(ht * 100);
}

export function priceTtcToCents(ttc: number): number {
  return Math.round(ttc * 100);
}

export function stripePriceIdForPlan(plan: SubscriptionPlan): string | undefined {
  const key =
    plan === 'STARTER'
      ? 'STRIPE_PRICE_STARTER'
      : plan === 'PRO'
        ? 'STRIPE_PRICE_PRO'
        : 'STRIPE_PRICE_BUSINESS';
  const id = process.env[key]?.trim();
  return id || undefined;
}

export function planFromStripePriceId(priceId: string): SubscriptionPlan | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER?.trim()) return 'STARTER';
  if (priceId === process.env.STRIPE_PRICE_PRO?.trim()) return 'PRO';
  if (priceId === process.env.STRIPE_PRICE_BUSINESS?.trim()) return 'BUSINESS';
  return null;
}

/** Stripe actif dès que la clé secrète est présente (montants = page /tarifs). */
export function isStripeCheckoutReady(): boolean {
  return isStripeEnabled();
}

/** Montant unitaire Stripe en centimes (toujours HT — TVA via Stripe Tax si activé). */
export function stripeLineItemAmountCents(plan: SubscriptionPlan): number {
  return priceHtToCents(PLAN_PRICE_HT_EUR[plan]);
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
