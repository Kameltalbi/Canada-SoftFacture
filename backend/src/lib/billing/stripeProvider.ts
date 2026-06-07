import type Stripe from 'stripe';
import type {
  BillingProviderAdapter,
  CreateCheckoutInput,
  CheckoutSessionResult,
} from './types.js';
import { getStripe, isStripeEnabled } from './stripeClient.js';
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
        mode: 'pending',
        message:
          'Paiement en ligne en cours de configuration. Vos informations ont été enregistrées ; vous serez notifié dès que le paiement sera activé.',
        provider: 'NONE',
      };
    }

    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        line_items: [buildSubscriptionLineItem(input.plan)],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        locale: 'fr',
        billing_address_collection: 'required',
        tax_id_collection: { enabled: true },
        allow_promotion_codes: true,
        client_reference_id: input.organizationId,
        metadata: {
          organizationId: input.organizationId,
          plan: input.plan,
          billingCheckoutSessionId: input.billingCheckoutSessionId,
        },
        subscription_data: {
          trial_period_days: input.trialDays,
          metadata: {
            organizationId: input.organizationId,
            plan: input.plan,
          },
        },
      };

      if (input.stripeCustomerId) {
        sessionParams.customer = input.stripeCustomerId;
      } else {
        sessionParams.customer_email = input.customerEmail;
      }

      if (isStripeAutomaticTaxEnabled()) {
        sessionParams.automatic_tax = { enabled: true };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        return {
          mode: 'pending',
          message: 'Impossible de créer la session de paiement Stripe. Réessayez plus tard.',
          provider: 'NONE',
        };
      }

      return {
        mode: 'redirect',
        checkoutUrl: session.url,
        providerSessionId: session.id,
        provider: 'STRIPE',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur Stripe';
      return {
        mode: 'pending',
        message: `Paiement temporairement indisponible : ${message}`,
        provider: 'NONE',
      };
    }
  }
}
