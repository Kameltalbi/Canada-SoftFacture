/**
 * NEQ (Numéro d'entreprise du Québec) : 10 chiffres.
 * Ex. : 1234567890
 */
export function normalizeNeq(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 10) return null;
  return digits;
}

/**
 * Numéro d'entreprise fédéral canadien (Business Number, BN) : 9 chiffres.
 * Le BN est aussi la base du numéro TPS (BN + RT0001) et TVQ.
 * Ex. : 123456789
 */
export function normalizeBn(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length < 9) return null;
  return digits.slice(0, 9);
}

/**
 * Numéro TPS/TVH (ex. 123456789 RT 0001) ou TVQ (ex. 1234567890 TQ 0001).
 * Accepte la racine BN (9 chiffres) ou le numéro complet avec suffixe.
 */
export function normalizeTaxNumber(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const cleaned = input.replace(/\s/g, '').toUpperCase();
  if (/^\d{9}(RT|TQ)\d{4}$/.test(cleaned)) return cleaned;
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 9 || digits.length === 10) return digits;
  return null;
}

/** @deprecated Utiliser normalizeNeq ou normalizeBn selon le contexte canadien. */
export function normalizeSiret(input: string | null | undefined): string | null {
  return normalizeNeq(input) ?? normalizeBn(input);
}

/** @deprecated Utiliser normalizeTaxNumber pour le Canada. */
export function normalizeVatNumber(input: string | null | undefined): string | null {
  return normalizeTaxNumber(input);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
