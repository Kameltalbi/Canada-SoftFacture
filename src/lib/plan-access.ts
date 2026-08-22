export function isProPlan(plan?: string | null): boolean {
  const value = (plan || '').toUpperCase();
  return value === 'PRO' || value === 'BUSINESS';
}
