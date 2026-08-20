import type { SubscriptionPlan } from '../generated/prisma/index.js';
import { prisma } from './db.js';
import { isProOrHigher } from './billing/plans.js';

/** Inventaire physique (comptage) — Pro et legacy Business. */
export function planHasStockInventory(plan: SubscriptionPlan): boolean {
  return isProOrHigher(plan);
}

/** Factures récurrentes — Pro et legacy Business uniquement. */
export function planHasRecurringInvoices(plan: SubscriptionPlan): boolean {
  return isProOrHigher(plan);
}

export async function getOrganizationPlan(organizationId: string): Promise<SubscriptionPlan> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionPlan: true },
  });
  return org?.subscriptionPlan ?? 'STARTER';
}
