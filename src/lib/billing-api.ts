import { apiFetch } from '@/lib/api-client';
import {
  PUBLIC_PLAN_IDS,
  PLAN_PRICES_HT_EUR,
  PLAN_TO_SUBSCRIPTION_API,
  priceHtToTtc,
  SUBSCRIPTION_VAT_RATE,
  TRIAL_DAYS,
  type PlanId,
} from '@/lib/pricing-plans';

export type BillingPlanPublic = {
  slug: PlanId;
  plan: 'STARTER' | 'PRO' | 'BUSINESS';
  priceTtcEur: number;
  priceHtEur: number;
  priceHtCad?: number;
  priceTtcCad?: number;
  vatRatePercent: number;
  trialDays: number;
  currency: string;
  country: string;
};

export type BillingPlansResponse = {
  country: string;
  currency: string;
  vatRatePercent: number;
  trialDays: number;
  paymentProviderConfigured: boolean;
  stripePublishableKey?: string | null;
  plans: BillingPlanPublic[];
};

export type BillingSubscriptionResponse = {
  plan: PlanId;
  subscriptionPlan: 'STARTER' | 'PRO' | 'BUSINESS';
  billingStatus: string;
  billingProvider: string;
  billingEmail: string | null;
  billingLegalName: string | null;
  billingSiret: string | null;
  billingVatNumber: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  pendingPlan: PlanId | null;
  paymentProviderConfigured: boolean;
  canManageBilling?: boolean;
  stripePublishableKey?: string | null;
};

export type CheckoutPayload = {
  plan: PlanId;
  cycle?: 'monthly' | 'yearly';
  locale?: 'fr' | 'en';
  billingLegalName: string;
  billingEmail: string;
  billingSiret?: string | null;
  billingVatNumber?: string | null;
  acceptTerms: true;
};

export type CheckoutResponse =
  | {
      sessionId: string;
      mode: 'embedded';
      clientSecret: string;
      publishableKey: string;
      stripeSessionId: string;
    }
  | { sessionId: string; mode: 'redirect'; checkoutUrl: string };

export function fetchBillingPlans() {
  return apiFetch<BillingPlansResponse>('/billing/plans', { skipAuth: true });
}

/** Repli synchrone (client ou SSR sans API). */
export function getStaticBillingPlans(): BillingPlansResponse {
  return staticBillingPlansResponse();
}

function staticBillingPlansResponse(): BillingPlansResponse {
  return {
    country: 'CA',
    currency: 'CAD',
    vatRatePercent: SUBSCRIPTION_VAT_RATE,
    trialDays: TRIAL_DAYS,
    paymentProviderConfigured: false,
    plans: PUBLIC_PLAN_IDS.map((slug) => ({
      slug,
      plan: PLAN_TO_SUBSCRIPTION_API[slug],
      priceHtEur: PLAN_PRICES_HT_EUR[slug],
      priceTtcEur: priceHtToTtc(PLAN_PRICES_HT_EUR[slug]),
      priceHtCad: PLAN_PRICES_HT_EUR[slug],
      priceTtcCad: priceHtToTtc(PLAN_PRICES_HT_EUR[slug]),
      vatRatePercent: SUBSCRIPTION_VAT_RATE,
      trialDays: slug === 'starter' ? 0 : TRIAL_DAYS,
      currency: 'CAD',
      country: 'CA',
    })),
  };
}

/** Plans publics — API billing en priorité, repli sur pricing-plans.ts. */
export async function getPublicBillingPlans(): Promise<BillingPlansResponse> {
  try {
    return await fetchBillingPlans();
  } catch {
    return staticBillingPlansResponse();
  }
}

export function planPricesHtFromBilling(billing: BillingPlansResponse): Record<PlanId, number> {
  const prices = { ...PLAN_PRICES_HT_EUR };
  for (const plan of billing.plans) {
    prices[plan.slug] = plan.priceHtCad ?? plan.priceHtEur ?? PLAN_PRICES_HT_EUR[plan.slug];
  }
  return prices;
}

export function planQuoteFromBilling(
  billing: BillingPlansResponse,
  planId: PlanId
): { priceHtEur: number; priceTtcEur: number; vatRatePercent: number } {
  const plan = billing.plans.find((p) => p.slug === planId);
  const priceHtEur = plan?.priceHtEur ?? PLAN_PRICES_HT_EUR[planId];
  return {
    priceHtEur,
    priceTtcEur: plan?.priceTtcEur ?? priceHtToTtc(priceHtEur),
    vatRatePercent: plan?.vatRatePercent ?? billing.vatRatePercent,
  };
}

export function fetchBillingSubscription() {
  return apiFetch<BillingSubscriptionResponse>('/billing/subscription');
}

export function createBillingCheckout(body: CheckoutPayload) {
  return apiFetch<CheckoutResponse>('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function confirmStripeCheckout(stripeSessionId: string) {
  const q = new URLSearchParams({ stripe_session_id: stripeSessionId });
  return apiFetch<{
    status: string;
    plan: string | null;
    billingStatus: string | null;
  }>(`/billing/checkout/stripe/confirm?${q}`);
}

export function createBillingPortalSession() {
  return apiFetch<{ url: string }>('/billing/portal', { method: 'POST' });
}
