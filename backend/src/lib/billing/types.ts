import type { SubscriptionPlan } from '../../generated/prisma/index.js';

export type CreateCheckoutInput = {
  organizationId: string;
  plan: SubscriptionPlan;
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
      mode: 'redirect';
      checkoutUrl: string;
      providerSessionId: string;
      provider: 'STRIPE';
    }
  | {
      mode: 'pending';
      message: string;
      provider: 'NONE';
    };

export interface BillingProviderAdapter {
  readonly name: 'STRIPE' | 'NONE';
  isConfigured(): boolean;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult>;
}
