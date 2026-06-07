import type { SubscriptionPlan } from '../generated/prisma/index.js';
import { prisma } from './db.js';

/** Inventaire physique (comptage) — offre Business. */
export function planHasStockInventory(plan: SubscriptionPlan): boolean {
  return plan === 'BUSINESS';
}

export async function getOrganizationPlan(organizationId: string): Promise<SubscriptionPlan> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionPlan: true },
  });
  return org?.subscriptionPlan ?? 'STARTER';
}
