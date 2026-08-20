import type Stripe from 'stripe';
import type {
  BillingProviderAdapter,
  CreateCheckoutInput,
  CheckoutSessionResult,
} from './types.js';
import { getStripe, getStripePublishableKey, isStripeEnabled } from './stripeClient.js';
import { buildSubscriptionLineItem } from './stripeLineItems.js';
import { isStripeAutomaticTaxEnabled } from './plans.js';

export class StripeBillingProvider implements BillingProviderAdapter {
  readonly name = 'STRIPE' as const;

  isConfigured(): boolean {
    return isStripeEnabled();
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult> {
    const stripe = getStripe();

    if (!stripe) {
      return {
        mode: 'error',
        message:
          'Stripe n’est pas configuré. Ajoutez STRIPE_SECRET_KEY (et STRIPE_PUBLISHABLE_KEY) dans backend/.env.',
        provider: 'NONE',
      };
    }

    const publishableKey = getStripePublishableKey();
    const embedded = Boolean(publishableKey);

    try {
      const session = await this.createSession(stripe, input, embedded, true);
      return this.toResult(session, publishableKey);
    } catch (err) {
      const firstMessage = err instanceof Error ? err.message : 'Erreur Stripe';
      if (isStripeAutomaticTaxEnabled() && /tax|automatic_tax/i.test(firstMessage)) {
        try {
          const session = await this.createSession(stripe, input, embedded, false);
          return this.toResult(session, publishableKey);
        } catch (retryErr) {
          return {
            mode: 'error',
            message: retryErr instanceof Error ? retryErr.message : firstMessage,
            provider: 'NONE',
          };
        }
      }
      return {
        mode: 'error',
        message: firstMessage,
        provider: 'NONE',
      };
    }
  }

  private async createSession(
    stripe: Stripe,
    input: CreateCheckoutInput,
    embedded: boolean,
    withAutomaticTax: boolean
  ): Promise<Stripe.Checkout.Session> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [buildSubscriptionLineItem(input.plan, input.billingInterval ?? 'month')],
      locale: input.locale === 'en' ? 'en' : 'fr-CA',
      billing_address_collection: 'required',
      tax_id_collection: { enabled: true },
      allow_promotion_codes: true,
      client_reference_id: input.organizationId,
      metadata: {
        organizationId: input.organizationId,
        plan: input.plan,
        interval: input.billingInterval ?? 'month',
        billingCheckoutSessionId: input.billingCheckoutSessionId,
      },
      subscription_data: {
        trial_period_days: input.trialDays,
        metadata: {
          organizationId: input.organizationId,
          plan: input.plan,
          interval: input.billingInterval ?? 'month',
        },
      },
    };

    if (embedded) {
      sessionParams.ui_mode = 'embedded';
      sessionParams.return_url = input.successUrl;
    } else {
      sessionParams.success_url = input.successUrl;
      sessionParams.cancel_url = input.cancelUrl;
    }

    if (input.stripeCustomerId) {
      sessionParams.customer = input.stripeCustomerId;
      sessionParams.customer_update = { address: 'auto', name: 'auto' };
    } else {
      sessionParams.customer_email = input.customerEmail;
    }

    if (withAutomaticTax && isStripeAutomaticTaxEnabled()) {
      sessionParams.automatic_tax = { enabled: true };
    }

    return stripe.checkout.sessions.create(sessionParams);
  }

  private toResult(
    session: Stripe.Checkout.Session,
    publishableKey: string | undefined
  ): CheckoutSessionResult {
    if (publishableKey && session.client_secret) {
      return {
        mode: 'embedded',
        clientSecret: session.client_secret,
        publishableKey,
        providerSessionId: session.id,
        provider: 'STRIPE',
      };
    }
    if (session.url) {
      return {
        mode: 'redirect',
        checkoutUrl: session.url,
        providerSessionId: session.id,
        provider: 'STRIPE',
      };
    }
    return {
      mode: 'error',
      message:
        'Impossible de créer la session de paiement Stripe. Vérifiez STRIPE_PUBLISHABLE_KEY.',
      provider: 'NONE',
    };
  }
}
