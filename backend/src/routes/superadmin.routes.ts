import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import type { BillingStatus, SubscriptionPlan, UserRole } from '../generated/prisma/index.js';

const router = Router();

router.get('/organizations', async (_req, res) => {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      billingEmail: true,
      billingLegalName: true,
      subscriptionPlan: true,
      pendingSubscriptionPlan: true,
      billingStatus: true,
      billingProvider: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
      onboardingCompletedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          users: true,
          clients: true,
          invoices: true,
          quotes: true,
          products: true,
          payments: true,
        },
      },
    },
  });
  return res.json(orgs);
});

router.get('/organizations/:id', async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id },
    include: {
      users: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      billingCheckoutSessions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          plan: true,
          status: true,
          provider: true,
          providerSessionId: true,
          amountTtcCents: true,
          currency: true,
          createdAt: true,
          expiresAt: true,
        },
      },
      _count: {
        select: {
          users: true,
          clients: true,
          invoices: true,
          quotes: true,
          products: true,
          payments: true,
          recurringInvoices: true,
          receivedInvoices: true,
        },
      },
    },
  });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });
  return res.json(org);
});

router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      organizationId: true,
      createdAt: true,
    },
    take: 200,
  });
  return res.json(users);
});

const subscriptionPlanSchema = z.enum(['STARTER', 'PRO', 'BUSINESS']);
const billingStatusSchema = z.enum([
  'NONE',
  'TRIAL',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'INCOMPLETE',
]);

const patchOrganizationBillingSchema = z.object({
  subscriptionPlan: subscriptionPlanSchema.optional(),
  billingStatus: billingStatusSchema.optional(),
  trialEndsAt: z.string().datetime().nullable().optional(),
  currentPeriodEnd: z.string().datetime().nullable().optional(),
  pendingSubscriptionPlan: subscriptionPlanSchema.nullable().optional(),
  clearStripeSubscription: z.boolean().optional(),
});

router.patch('/organizations/:id/billing', async (req, res) => {
  const parsed = patchOrganizationBillingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const data: {
    subscriptionPlan?: SubscriptionPlan;
    billingStatus?: BillingStatus;
    trialEndsAt?: Date | null;
    currentPeriodEnd?: Date | null;
    pendingSubscriptionPlan?: SubscriptionPlan | null;
    stripeSubscriptionId?: null;
  } = {};

  if (parsed.data.subscriptionPlan) data.subscriptionPlan = parsed.data.subscriptionPlan;
  if (parsed.data.billingStatus) data.billingStatus = parsed.data.billingStatus;
  if ('trialEndsAt' in parsed.data) {
    data.trialEndsAt = parsed.data.trialEndsAt ? new Date(parsed.data.trialEndsAt) : null;
  }
  if ('currentPeriodEnd' in parsed.data) {
    data.currentPeriodEnd = parsed.data.currentPeriodEnd
      ? new Date(parsed.data.currentPeriodEnd)
      : null;
  }
  if ('pendingSubscriptionPlan' in parsed.data) {
    data.pendingSubscriptionPlan = parsed.data.pendingSubscriptionPlan ?? null;
  }
  if (parsed.data.clearStripeSubscription) data.stripeSubscriptionId = null;

  const org = await prisma.organization.update({
    where: { id: req.params.id },
    data,
  });
  return res.json(org);
});

const extendOrganizationSchema = z.object({
  days: z.number().int().min(1).max(730),
  field: z.enum(['trialEndsAt', 'currentPeriodEnd']).default('currentPeriodEnd'),
});

router.post('/organizations/:id/extend', async (req, res) => {
  const parsed = extendOrganizationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const org = await prisma.organization.findUnique({ where: { id: req.params.id } });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });

  const current = org[parsed.data.field] ?? new Date();
  const base = current > new Date() ? current : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + parsed.data.days);

  const updated = await prisma.organization.update({
    where: { id: req.params.id },
    data: {
      [parsed.data.field]: next,
      billingStatus: parsed.data.field === 'trialEndsAt' ? 'TRIAL' : org.billingStatus,
    },
  });
  return res.json(updated);
});

const patchUserSchema = z.object({
  role: z.enum(['SUPERADMIN', 'ADMIN', 'USER']).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(120).nullable().optional(),
});

router.patch('/users/:id', async (req, res) => {
  const parsed = patchUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }
  const data: { role?: UserRole; isActive?: boolean; name?: string | null } = {};
  if (parsed.data.role) data.role = parsed.data.role;
  if (typeof parsed.data.isActive === 'boolean') data.isActive = parsed.data.isActive;
  if ('name' in parsed.data) data.name = parsed.data.name ?? null;
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  return res.json(user);
});

const deleteOrganizationSchema = z.object({
  confirmName: z.string().min(1),
});

router.delete('/organizations/:id', async (req, res) => {
  const parsed = deleteOrganizationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Confirmation requise' });
  }
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, stripeSubscriptionId: true },
  });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });
  if (parsed.data.confirmName !== org.name) {
    return res.status(400).json({ error: 'Le nom de confirmation ne correspond pas' });
  }
  if (org.stripeSubscriptionId) {
    return res.status(409).json({
      error:
        'Organisation liée à un abonnement Stripe. Annulez ou détachez l’abonnement avant suppression.',
    });
  }
  await prisma.organization.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

export default router;
