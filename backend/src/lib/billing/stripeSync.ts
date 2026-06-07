import type Stripe from 'stripe';
import type { BillingStatus, SubscriptionPlan } from '../../generated/prisma/index.js';
import { prisma } from '../db.js';
import { planFromStripePriceId, stripePriceIdForPlan } from './plans.js';

function planFromMetadata(meta: Stripe.Metadata | null | undefined): SubscriptionPlan | null {
  const p = meta?.plan;
  if (p === 'STARTER' || p === 'PRO' || p === 'BUSINESS') return p;
  return null;
}

export function resolvePlanFromSubscription(
  subscription: Stripe.Subscription
): SubscriptionPlan | null {
  const fromMeta = planFromMetadata(subscription.metadata);
  if (fromMeta) return fromMeta;

  const priceId = subscription.items.data[0]?.price?.id;
  if (priceId) {
    const fromPrice = planFromStripePriceId(priceId);
    if (fromPrice) return fromPrice;
  }
  return null;
}

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): BillingStatus {
  switch (status) {
    case 'trialing':
      return 'TRIAL';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAST_DUE';
    case 'canceled':
    case 'unpaid':
      return 'CANCELED';
    case 'incomplete':
    case 'incomplete_expired':
      return 'INCOMPLETE';
    case 'paused':
      return 'PAST_DUE';
    default:
      return 'INCOMPLETE';
  }
}

export async function applyStripeSubscriptionToOrg(
  organizationId: string,
  subscription: Stripe.Subscription,
  options?: { stripeCustomerId?: string; checkoutSessionId?: string }
): Promise<void> {
  const plan = resolvePlanFromSubscription(subscription);
  if (!plan) {
    throw new Error(`Impossible de déterminer le plan Stripe pour org ${organizationId}`);
  }

  const billingStatus = mapStripeSubscriptionStatus(subscription.status);
  const trialEndsAt =
    subscription.trial_end != null ? new Date(subscription.trial_end * 1000) : null;
  const currentPeriodEnd =
    subscription.current_period_end != null
      ? new Date(subscription.current_period_end * 1000)
      : null;

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionPlan: plan,
        pendingSubscriptionPlan: null,
        billingStatus,
        billingProvider: 'STRIPE',
        stripeCustomerId: options?.stripeCustomerId ?? customerId ?? undefined,
        stripeSubscriptionId: subscription.id,
        trialEndsAt,
        currentPeriodEnd,
      },
    });
    if (options?.checkoutSessionId) {
      await tx.billingCheckoutSession.updateMany({
        where: {
          organizationId,
          providerSessionId: options.checkoutSessionId,
        },
        data: { status: 'COMPLETED' },
      });
    }
  });
}

export async function markOrgBillingCanceled(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      billingStatus: 'CANCELED',
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      subscriptionPlan: 'STARTER',
    },
  });
}

export async function markOrgPastDue(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { billingStatus: 'PAST_DUE' },
  });
}

export function assertStripePriceConfigured(plan: SubscriptionPlan): string {
  const priceId = stripePriceIdForPlan(plan);
  if (!priceId) {
    throw new Error(`STRIPE_PRICE_${plan} non configuré`);
  }
  return priceId;
}
