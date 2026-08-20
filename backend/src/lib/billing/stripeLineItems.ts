import type Stripe from 'stripe';
import type { SubscriptionPlan } from '../../generated/prisma/index.js';
import {
  PLAN_PRICE_HT_CAD,
  PLAN_STRIPE_LABELS,
  stripeLineItemAmountCents,
  stripePriceIdForPlan,
  yearlyPriceHtCad,
  type BillingInterval,
} from './plans.js';

/**
 * Ligne d'abonnement Checkout : Price ID Dashboard optionnel,
 * sinon montant HT CAD de la page /tarifs via price_data (+ taxes Stripe Tax).
 */
export function buildSubscriptionLineItem(
  plan: SubscriptionPlan,
  interval: BillingInterval = 'month'
): Stripe.Checkout.SessionCreateParams.LineItem {
  const priceId = stripePriceIdForPlan(plan, interval);
  if (priceId) {
    return { price: priceId, quantity: 1 };
  }

  const monthlyHt = PLAN_PRICE_HT_CAD[plan];
  const ht = interval === 'year' ? yearlyPriceHtCad(monthlyHt) : monthlyHt;
  const unitAmount = stripeLineItemAmountCents(plan, interval);
  const periodLabel = interval === 'year' ? 'an' : 'mois';

  return {
    quantity: 1,
    price_data: {
      currency: 'cad',
      unit_amount: unitAmount,
      tax_behavior: 'exclusive',
      product_data: {
        name: PLAN_STRIPE_LABELS[plan],
        description: `$${ht.toFixed(2)} CAD/${periodLabel} avant taxes (page Tarifs). TPS/TVQ en sus via Stripe Tax.`,
      },
      recurring: { interval },
    },
  };
}
