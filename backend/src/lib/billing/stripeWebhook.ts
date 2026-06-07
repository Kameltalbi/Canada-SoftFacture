import type Stripe from 'stripe';
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { getStripe } from './stripeClient.js';
import {
  applyStripeSubscriptionToOrg,
  markOrgBillingCanceled,
  markOrgPastDue,
  resolvePlanFromSubscription,
} from './stripeSync.js';

async function orgIdFromSubscription(subscription: Stripe.Subscription): Promise<string | null> {
  if (subscription.metadata?.organizationId) {
    return subscription.metadata.organizationId;
  }
  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subscription.id },
    select: { id: true },
  });
  return org?.id ?? null;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orgId = session.metadata?.organizationId;
  if (!orgId) {
    logger.warn({ sessionId: session.id }, 'checkout.session.completed sans organizationId');
    return;
  }

  const stripe = getStripe();
  if (!stripe) return;

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

  if (!subscriptionId) {
    logger.warn({ sessionId: session.id }, 'checkout.session.completed sans subscription');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

  await applyStripeSubscriptionToOrg(orgId, subscription, {
    stripeCustomerId: customerId ?? undefined,
    checkoutSessionId: session.id,
  });

  const internalId = session.metadata?.billingCheckoutSessionId;
  if (internalId) {
    await prisma.billingCheckoutSession.updateMany({
      where: { id: internalId, organizationId: orgId },
      data: { status: 'COMPLETED', providerSessionId: session.id },
    });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const orgId = await orgIdFromSubscription(subscription);
  if (!orgId) {
    logger.warn({ subscriptionId: subscription.id }, 'subscription sans organizationId');
    return;
  }
  await applyStripeSubscriptionToOrg(orgId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const orgId = await orgIdFromSubscription(subscription);
  if (!orgId) return;
  await markOrgBillingCanceled(orgId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;

  const org = await prisma.organization.findFirst({
    where: { stripeSubscriptionId: subId },
    select: { id: true },
  });
  if (org) await markOrgPastDue(org.id);
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      logger.debug({ type: event.type }, 'Stripe webhook ignoré');
  }
}

export async function retrieveCheckoutSessionForOrg(
  stripeSessionId: string,
  organizationId: string
): Promise<{
  status: string;
  plan: string | null;
  billingStatus: string | null;
}> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe non configuré');

  const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
    expand: ['subscription'],
  });

  if (session.metadata?.organizationId !== organizationId) {
    throw new Error('Session non autorisée');
  }

  const sub =
    typeof session.subscription === 'object' && session.subscription ? session.subscription : null;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { billingStatus: true, subscriptionPlan: true },
  });

  return {
    status: session.status ?? 'unknown',
    plan: sub ? resolvePlanFromSubscription(sub) : (org?.subscriptionPlan ?? null),
    billingStatus: org?.billingStatus ?? null,
  };
}
