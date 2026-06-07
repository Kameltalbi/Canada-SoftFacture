import type Stripe from 'stripe';
import type { SubscriptionPlan } from '../../generated/prisma/index.js';
import {
  PLAN_PRICE_HT_EUR,
  PLAN_STRIPE_LABELS,
  stripeLineItemAmountCents,
  stripePriceIdForPlan,
} from './plans.js';

/**
 * Ligne d'abonnement Checkout : Price ID Dashboard optionnel,
 * sinon montant HT de la page /tarifs via price_data (+ TVA Stripe Tax).
 */
export function buildSubscriptionLineItem(
  plan: SubscriptionPlan
): Stripe.Checkout.SessionCreateParams.LineItem {
  const priceId = stripePriceIdForPlan(plan);
  if (priceId) {
    return { price: priceId, quantity: 1 };
  }

  const ht = PLAN_PRICE_HT_EUR[plan];
  const unitAmount = stripeLineItemAmountCents(plan);

  return {
    quantity: 1,
    price_data: {
      currency: 'eur',
      unit_amount: unitAmount,
      product_data: {
        name: PLAN_STRIPE_LABELS[plan],
        description: `${ht.toFixed(2).replace('.', ',')} € HT/mois (comme sur la page Tarifs). TVA en sus.`,
      },
      recurring: { interval: 'month' },
    },
  };
}
