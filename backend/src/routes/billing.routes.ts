import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireRoles } from '../middleware/auth.js';
import {
  PUBLIC_BILLING_PLAN_SLUGS,
  TRIAL_DAYS,
  getBillingProvider,
  getFrontendBaseUrl,
  isStripeCheckoutReady,
  priceHtToTtcCad,
  priceTtcToCents,
  slugToCheckoutPlan,
  slugToSubscriptionPlan,
  subscriptionPlanToSlug,
  PLAN_PRICE_HT_CAD,
  SUBSCRIPTION_VAT_RATE_PERCENT,
  yearlyPriceHtCad,
} from '../lib/billing/index.js';
import { isValidEmail, normalizeSiret, normalizeVatNumber } from '../lib/billing/validation.js';
import { getStripe, getStripePublishableKey } from '../lib/billing/stripeClient.js';
import { retrieveCheckoutSessionForOrg } from '../lib/billing/stripeWebhook.js';
export const billingPublicRouter = Router();

const checkoutBodySchema = z.object({
  /** business accepté pour rétrocompat (redirigé vers Pro). */
  plan: z.enum(['pro', 'business']),
  cycle: z.enum(['monthly', 'yearly']).optional().default('monthly'),
  locale: z.enum(['fr', 'en']).optional(),
  billingLegalName: z.string().min(2).max(200),
  billingEmail: z.string().email().max(200),
  billingSiret: z.string().max(20).optional().nullable(),
  billingVatNumber: z.string().max(20).optional().nullable(),
  acceptTerms: z.literal(true, { message: 'Vous devez accepter les CGV' }),
});

/** Plans publics (tarifs Canada, avant TPS). */
billingPublicRouter.get('/plans', (_req, res) => {
  const plans = PUBLIC_BILLING_PLAN_SLUGS.map((slug) => {
    const apiPlan = slugToSubscriptionPlan(slug)!;
    const priceHt = PLAN_PRICE_HT_CAD[apiPlan];
    const priceTtc = priceHtToTtcCad(priceHt);
    return {
      slug,
      plan: apiPlan,
      priceHtCad: priceHt,
      priceTtcCad: priceTtc,
      priceHtEur: priceHt,
      priceTtcEur: priceTtc,
      vatRatePercent: SUBSCRIPTION_VAT_RATE_PERCENT,
      trialDays: TRIAL_DAYS,
      currency: 'CAD',
      country: 'CA',
    };
  });
  return res.json({
    country: 'CA',
    currency: 'CAD',
    vatRatePercent: SUBSCRIPTION_VAT_RATE_PERCENT,
    trialDays: TRIAL_DAYS,
    paymentProviderConfigured: isStripeCheckoutReady(),
    stripePublishableKey: getStripePublishableKey() ?? null,
    plans,
  });
});

const billingProtectedRouter = Router();

/** État d'abonnement de l'organisation connectée. */
billingProtectedRouter.get('/subscription', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      subscriptionPlan: true,
      billingStatus: true,
      billingProvider: true,
      billingEmail: true,
      billingLegalName: true,
      billingSiret: true,
      billingVatNumber: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      pendingSubscriptionPlan: true,
      stripeCustomerId: true,
    },
  });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });

  return res.json({
    plan: subscriptionPlanToSlug(org.subscriptionPlan),
    subscriptionPlan: org.subscriptionPlan,
    billingStatus: org.billingStatus,
    billingProvider: org.billingProvider,
    billingEmail: org.billingEmail,
    billingLegalName: org.billingLegalName,
    billingSiret: org.billingSiret,
    billingVatNumber: org.billingVatNumber,
    trialEndsAt: org.trialEndsAt,
    currentPeriodEnd: org.currentPeriodEnd,
    pendingPlan: org.pendingSubscriptionPlan
      ? subscriptionPlanToSlug(org.pendingSubscriptionPlan)
      : null,
    paymentProviderConfigured: isStripeCheckoutReady(),
    canManageBilling: Boolean(org.stripeCustomerId) && isStripeCheckoutReady(),
    stripePublishableKey: getStripePublishableKey() ?? null,
  });
});

/** Crée une session Stripe Checkout (formulaire embarqué sur /checkout). */
billingProtectedRouter.post('/checkout', requireRoles('ADMIN'), async (req, res) => {
  const parsed = checkoutBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const orgId = req.user!.organizationId!;
  const plan = slugToCheckoutPlan(parsed.data.plan);
  if (!plan || PLAN_PRICE_HT_CAD[plan] <= 0) {
    return res.status(400).json({ error: 'Offre invalide' });
  }

  const billingInterval = parsed.data.cycle === 'yearly' ? 'year' : 'month';

  const billingEmail = parsed.data.billingEmail.trim().toLowerCase();
  if (!isValidEmail(billingEmail)) {
    return res.status(400).json({ error: 'Email de facturation invalide' });
  }

  const siret = normalizeSiret(parsed.data.billingSiret);
  if (parsed.data.billingSiret?.trim() && !siret) {
    return res.status(400).json({ error: 'SIRET invalide (14 chiffres attendus)' });
  }

  const vatNumber = normalizeVatNumber(parsed.data.billingVatNumber);
  if (parsed.data.billingVatNumber?.trim() && !vatNumber) {
    return res.status(400).json({ error: 'N° de TVA intracommunautaire invalide' });
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });

  const monthlyHt = PLAN_PRICE_HT_CAD[plan];
  const priceHt = billingInterval === 'year' ? yearlyPriceHtCad(monthlyHt, plan) : monthlyHt;
  const amountTtcCents = priceTtcToCents(priceHtToTtcCad(priceHt));
  const baseUrl = getFrontendBaseUrl();
  const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/checkout/cancel?plan=pro&cycle=${parsed.data.cycle}`;

  const provider = getBillingProvider();
  const checkoutSession = await prisma.billingCheckoutSession.create({
    data: {
      organizationId: orgId,
      plan,
      amountTtcCents,
      successUrl,
      cancelUrl,
      customerEmail: billingEmail,
      billingLegalName: parsed.data.billingLegalName.trim(),
      billingSiret: siret,
      billingVatNumber: vatNumber,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      billingEmail,
      billingLegalName: parsed.data.billingLegalName.trim(),
      billingSiret: siret,
      billingVatNumber: vatNumber,
      pendingSubscriptionPlan: plan,
      billingStatus: org.billingStatus === 'ACTIVE' ? org.billingStatus : 'INCOMPLETE',
    },
  });

  const result = await provider.createCheckoutSession({
    organizationId: orgId,
    plan,
    billingInterval,
    locale: parsed.data.locale,
    billingCheckoutSessionId: checkoutSession.id,
    stripeCustomerId: org.stripeCustomerId,
    customerEmail: billingEmail,
    billingLegalName: parsed.data.billingLegalName.trim(),
    billingSiret: siret,
    billingVatNumber: vatNumber,
    successUrl,
    cancelUrl,
    amountTtcCents,
    currency: 'CAD',
    trialDays: TRIAL_DAYS,
  });

  if (result.mode === 'embedded') {
    await prisma.billingCheckoutSession.update({
      where: { id: checkoutSession.id },
      data: {
        provider: result.provider,
        providerSessionId: result.providerSessionId,
      },
    });
    return res.json({
      sessionId: checkoutSession.id,
      mode: 'embedded',
      clientSecret: result.clientSecret,
      publishableKey: result.publishableKey,
      stripeSessionId: result.providerSessionId,
    });
  }

  if (result.mode === 'redirect') {
    await prisma.billingCheckoutSession.update({
      where: { id: checkoutSession.id },
      data: {
        provider: result.provider,
        providerSessionId: result.providerSessionId,
      },
    });
    return res.json({
      sessionId: checkoutSession.id,
      mode: 'redirect',
      checkoutUrl: result.checkoutUrl,
    });
  }

  return res.status(422).json({ error: result.message });
});

/** Confirme une session Stripe Checkout après paiement (success page). */
billingProtectedRouter.get('/checkout/stripe/confirm', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const stripeSessionId =
    typeof req.query.stripe_session_id === 'string' ? req.query.stripe_session_id : null;
  if (!stripeSessionId?.startsWith('cs_')) {
    return res.status(400).json({ error: 'session_id invalide' });
  }
  try {
    const result = await retrieveCheckoutSessionForOrg(stripeSessionId, orgId);
    return res.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur';
    return res.status(400).json({ error: msg });
  }
});

billingProtectedRouter.get('/checkout/:sessionId', async (req, res) => {
  const orgId = req.user!.organizationId!;
  const session = await prisma.billingCheckoutSession.findFirst({
    where: { id: req.params.sessionId, organizationId: orgId },
  });
  if (!session) return res.status(404).json({ error: 'Session introuvable' });
  return res.json({
    id: session.id,
    status: session.status,
    plan: subscriptionPlanToSlug(session.plan),
    amountTtcCents: session.amountTtcCents,
    currency: session.currency,
    createdAt: session.createdAt,
  });
});

/** Portail client Stripe (factures, moyen de paiement, résiliation). */
billingProtectedRouter.post('/portal', requireRoles('ADMIN'), async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe non configuré' });
  }

  const orgId = req.user!.organizationId!;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { stripeCustomerId: true },
  });
  if (!org?.stripeCustomerId) {
    return res.status(400).json({
      error: 'Aucun client Stripe associé. Finalisez d’abord un abonnement via le checkout.',
    });
  }

  const returnUrl = `${getFrontendBaseUrl()}/subscription`;
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
    locale: 'fr',
  });

  return res.json({ url: portalSession.url });
});

export default billingProtectedRouter;
