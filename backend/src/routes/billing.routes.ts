import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireRoles } from '../middleware/auth.js';
import {
  BILLING_PLAN_SLUGS,
  TRIAL_DAYS,
  getBillingProvider,
  getFrontendBaseUrl,
  isStripeCheckoutReady,
  priceHtToTtcEur,
  priceTtcToCents,
  slugToSubscriptionPlan,
  subscriptionPlanToSlug,
  PLAN_PRICE_HT_EUR,
  SUBSCRIPTION_VAT_RATE_PERCENT,
} from '../lib/billing/index.js';
import { isValidEmail, normalizeSiret, normalizeVatNumber } from '../lib/billing/validation.js';
import { getStripe } from '../lib/billing/stripeClient.js';
import { retrieveCheckoutSessionForOrg } from '../lib/billing/stripeWebhook.js';
export const billingPublicRouter = Router();

const checkoutBodySchema = z.object({
  plan: z.enum(['starter', 'pro', 'business']),
  billingLegalName: z.string().min(2).max(200),
  billingEmail: z.string().email().max(200),
  billingSiret: z.string().max(20).optional().nullable(),
  billingVatNumber: z.string().max(20).optional().nullable(),
  acceptTerms: z.literal(true, { message: 'Vous devez accepter les CGV' }),
});

/** Plans publics (tarifs France, HT). */
billingPublicRouter.get('/plans', (_req, res) => {
  const plans = BILLING_PLAN_SLUGS.map((slug) => {
    const apiPlan = slugToSubscriptionPlan(slug)!;
    const priceHt = PLAN_PRICE_HT_EUR[apiPlan];
    const priceTtc = priceHtToTtcEur(priceHt);
    return {
      slug,
      plan: apiPlan,
      priceHtEur: priceHt,
      priceTtcEur: priceTtc,
      vatRatePercent: SUBSCRIPTION_VAT_RATE_PERCENT,
      trialDays: TRIAL_DAYS,
      currency: 'EUR',
      country: 'FR',
    };
  });
  return res.json({
    country: 'FR',
    currency: 'EUR',
    vatRatePercent: SUBSCRIPTION_VAT_RATE_PERCENT,
    trialDays: TRIAL_DAYS,
    paymentProviderConfigured: isStripeCheckoutReady(),
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
  });
});

/** Crée une session de paiement (Stripe ou mode attente). */
billingProtectedRouter.post('/checkout', requireRoles('ADMIN'), async (req, res) => {
  const parsed = checkoutBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const orgId = req.user!.organizationId!;
  const plan = slugToSubscriptionPlan(parsed.data.plan);
  if (!plan) return res.status(400).json({ error: 'Offre invalide' });

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

  const priceHt = PLAN_PRICE_HT_EUR[plan];
  const amountTtcCents = priceTtcToCents(priceHtToTtcEur(priceHt));
  const baseUrl = getFrontendBaseUrl();
  const successUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/checkout/cancel?plan=${parsed.data.plan}`;

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
    billingCheckoutSessionId: checkoutSession.id,
    stripeCustomerId: org.stripeCustomerId,
    customerEmail: billingEmail,
    billingLegalName: parsed.data.billingLegalName.trim(),
    billingSiret: siret,
    billingVatNumber: vatNumber,
    successUrl,
    cancelUrl,
    amountTtcCents,
    currency: 'EUR',
    trialDays: TRIAL_DAYS,
  });

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

  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  await prisma.$transaction([
    prisma.billingCheckoutSession.update({
      where: { id: checkoutSession.id },
      data: { status: 'PENDING' },
    }),
    prisma.organization.update({
      where: { id: orgId },
      data: {
        subscriptionPlan: plan,
        pendingSubscriptionPlan: null,
        billingStatus: 'TRIAL',
        trialEndsAt,
      },
    }),
  ]);

  return res.json({
    sessionId: checkoutSession.id,
    mode: 'pending',
    message: result.message,
    trialEndsAt: trialEndsAt.toISOString(),
    plan: parsed.data.plan,
  });
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

/** Confirme une session Stripe Checkout après redirection (success page). */
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
