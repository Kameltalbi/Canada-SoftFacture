import { randomBytes } from 'node:crypto';

export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

export function resetExpiresAt(hours = 1): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}
