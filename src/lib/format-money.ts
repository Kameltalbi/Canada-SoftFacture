/** Affichage montants en euro (fr-FR). */
export function formatEuro(value: number, options?: { compact?: boolean }): string {
  if (options?.compact && Math.abs(value) >= 1000) {
    return `${value.toLocaleString('fr-FR', {
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short',
    })} €`;
  }
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

export function formatEuroShort(value: number): string {
  if (value === 0) return '0 €';
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M€`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`;
  }
  return formatEuro(value);
}
