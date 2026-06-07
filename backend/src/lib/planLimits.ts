import type { SubscriptionPlan } from '../generated/prisma/index.js';
import { prisma } from './db.js';

/** Nombre max d'utilisateurs actifs + invitations en attente par plan. */
export const PLAN_MAX_USERS: Record<SubscriptionPlan, number> = {
  STARTER: 1,
  PRO: 3,
  BUSINESS: 5,
};

export function maxUsersForPlan(plan: SubscriptionPlan): number {
  return PLAN_MAX_USERS[plan];
}

export async function countOrganizationSeats(organizationId: string): Promise<{
  activeUsers: number;
  pendingInvites: number;
  total: number;
}> {
  const now = new Date();
  const [activeUsers, pendingInvites] = await Promise.all([
    prisma.user.count({
      where: { organizationId, isActive: true },
    }),
    prisma.userInvitation.count({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: now },
      },
    }),
  ]);
  return { activeUsers, pendingInvites, total: activeUsers + pendingInvites };
}

export async function assertCanAddOrgSeat(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionPlan: true },
  });
  if (!org) throw new Error('Organisation introuvable');

  const max = maxUsersForPlan(org.subscriptionPlan);
  const { total } = await countOrganizationSeats(organizationId);
  if (total >= max) {
    throw new SeatLimitError(max, org.subscriptionPlan);
  }
}

export class SeatLimitError extends Error {
  readonly code = 'SEAT_LIMIT' as const;
  constructor(
    public readonly max: number,
    public readonly plan: SubscriptionPlan
  ) {
    super(`Limite d'utilisateurs atteinte (${max} pour le plan ${plan})`);
    this.name = 'SeatLimitError';
  }
}
