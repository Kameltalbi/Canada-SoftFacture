/** SoftFacture Canada — default organization country (ISO 3166-1 alpha-2). */
export const DEFAULT_ORG_COUNTRY = 'CA';

const COUNTRY_LABELS: Record<string, string> = {
  CA: 'Canada',
  FR: 'France',
  US: 'United States',
  BE: 'Belgique',
  CH: 'Suisse',
};

/**
 * Preserve an explicit org country; otherwise default to Canada.
 * Logic: `existingCountry ?? "CA"` (invalid / empty → CA).
 */
export function resolveOrgCountry(existingCountry?: string | null): string {
  const code = existingCountry?.trim().toUpperCase();
  if (code && /^[A-Z]{2}$/.test(code)) return code;
  return DEFAULT_ORG_COUNTRY;
}

export function orgCountryLabel(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  return COUNTRY_LABELS[code] ?? code;
}

/** Quebec NEQ (10) or federal BN (9) — not French SIRET (14). */
export function isValidCanadianBusinessNumber(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  return digits.length === 9 || digits.length === 10;
}
