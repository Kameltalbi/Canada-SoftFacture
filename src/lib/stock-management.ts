export function organizationManagesStock(
  org: { stockManagementEnabled?: boolean } | null | undefined
): boolean {
  return org?.stockManagementEnabled === true;
}
