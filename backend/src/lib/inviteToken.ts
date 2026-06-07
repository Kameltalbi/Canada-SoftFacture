import { randomBytes } from 'node:crypto';

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function inviteExpiresAt(days = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
