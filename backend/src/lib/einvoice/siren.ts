import { normalizeSiret } from '../billing/validation.js';

/** SIREN : 9 chiffres (entreprise France). */
export function normalizeSiren(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 9) return digits;
  if (digits.length === 14) return digits.slice(0, 9);
  return null;
}

export function isValidSiren(value: string): boolean {
  return /^\d{9}$/.test(value);
}

/** SIREN explicite ou dérivé du SIRET / taxId client. */
export function resolveClientSiren(client: {
  siren?: string | null;
  taxId?: string | null;
}): string | null {
  const fromSiren = normalizeSiren(client.siren);
  if (fromSiren) return fromSiren;
  const fromSiret = normalizeSiret(client.taxId);
  if (fromSiret) return fromSiret.slice(0, 9);
  return normalizeSiren(client.taxId);
}
