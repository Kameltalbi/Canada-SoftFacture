import { prisma } from './db.js';

export async function organizationManagesStock(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stockManagementEnabled: true },
  });
  return org?.stockManagementEnabled ?? false;
}

export async function assertOrganizationManagesStock(organizationId: string): Promise<void> {
  if (!(await organizationManagesStock(organizationId))) {
    const err = new Error('STOCK_DISABLED');
    throw err;
  }
}
