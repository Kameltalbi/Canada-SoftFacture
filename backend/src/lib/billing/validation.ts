/** SIRET : 14 chiffres (établissement France). */
export function normalizeSiret(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 14) return null;
  return digits;
}

/** N° TVA intracommunautaire (ex. FR12345678901). */
export function normalizeVatNumber(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;
  const v = input.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(v)) return null;
  return v;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
