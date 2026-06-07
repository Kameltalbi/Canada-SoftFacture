import { normalizeNeq, normalizeBn } from '../billing/validation.js';

/**
 * Normalise un BN (Business Number, 9 chiffres) ou NEQ (10 chiffres) canadien.
 * Utilisé comme identifiant légal du client dans les documents.
 */
export function normalizeBusinessId(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 9) return digits;
  if (digits.length === 10) return digits;
  return null;
}

export function isValidBusinessId(value: string): boolean {
  return /^\d{9,10}$/.test(value);
}

/** BN/NEQ explicite ou dérivé du taxId client. */
export function resolveClientBusinessId(client: {
  siren?: string | null;
  taxId?: string | null;
}): string | null {
  const fromSiren = normalizeBusinessId(client.siren);
  if (fromSiren) return fromSiren;
  const fromNeq = normalizeNeq(client.taxId);
  if (fromNeq) return fromNeq;
  return normalizeBn(client.taxId);
}

/** @deprecated Utiliser resolveClientBusinessId */
export function resolveClientSiren(client: {
  siren?: string | null;
  taxId?: string | null;
}): string | null {
  return resolveClientBusinessId(client);
}

/** @deprecated Utiliser normalizeBusinessId */
export function normalizeSiren(input: string | null | undefined): string | null {
  return normalizeBusinessId(input);
}

/** @deprecated Utiliser isValidBusinessId */
export function isValidSiren(value: string): boolean {
  return isValidBusinessId(value);
}
