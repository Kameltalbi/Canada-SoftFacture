import type { SubscriptionPlan } from '../../generated/prisma/index.js';
import type { BillingInterval } from './plans.js';

export type CreateCheckoutInput = {
  organizationId: string;
  plan: SubscriptionPlan;
  billingInterval?: BillingInterval;
  locale?: 'fr' | 'en';
  billingCheckoutSessionId: string;
  stripeCustomerId?: string | null;
  customerEmail: string;
  billingLegalName: string;
  billingSiret?: string | null;
  billingVatNumber?: string | null;
  successUrl: string;
  cancelUrl: string;
  amountTtcCents: number;
  currency: string;
  trialDays: number;
};

export type CheckoutSessionResult =
  | {
      mode: 'embedded';
      clientSecret: string;
      publishableKey: string;
      providerSessionId: string;
      provider: 'STRIPE';
    }
  | {
      mode: 'redirect';
      checkoutUrl: string;
      providerSessionId: string;
      provider: 'STRIPE';
    }
  | {
      mode: 'error';
      message: string;
      provider: 'NONE';
    };

export interface BillingProviderAdapter {
  readonly name: 'STRIPE' | 'NONE';
  isConfigured(): boolean;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult>;
}
