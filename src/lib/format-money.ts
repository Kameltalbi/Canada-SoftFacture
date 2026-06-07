/** Locale et symbole par devise. */
const CURRENCY_LOCALE: Record<string, string> = {
  CAD: 'fr-CA',
  EUR: 'fr-FR',
  USD: 'en-US',
  GBP: 'en-GB',
  CHF: 'fr-CH',
};

function localeForCurrency(currency: string): string {
  return CURRENCY_LOCALE[currency] ?? 'fr-CA';
}

/** Affichage montants avec devise (CAD par défaut). */
export function formatCurrency(
  value: number,
  currency = 'CAD',
  options?: { compact?: boolean }
): string {
  const locale = localeForCurrency(currency);
  if (options?.compact && Math.abs(value) >= 1000) {
    return value.toLocaleString(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short',
    });
  }
  return value.toLocaleString(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrencyShort(value: number, currency = 'CAD'): string {
  const locale = localeForCurrency(currency);
  if (value === 0) return formatCurrency(0, currency);
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })} M${currency}`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} k${currency}`;
  }
  return formatCurrency(value, currency);
}

/** @deprecated Utiliser formatCurrency(value, 'EUR') */
export function formatEuro(value: number, options?: { compact?: boolean }): string {
  return formatCurrency(value, 'EUR', options);
}

/** @deprecated Utiliser formatCurrencyShort(value, 'EUR') */
export function formatEuroShort(value: number): string {
  return formatCurrencyShort(value, 'EUR');
}
