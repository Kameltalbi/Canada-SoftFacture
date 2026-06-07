import { getApiBase } from '@/lib/api-client';

const MAX_LOGO_BYTES = 700 * 1024;

export function validateLogoFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Format image invalide';
  if (file.size > MAX_LOGO_BYTES) return 'Logo trop lourd (max 700 Ko)';
  return null;
}

/** URL affichable (navigateur) à partir de logoUrl stocké en base. */
export function resolveLogoDisplayUrl(
  logoUrl: string | null | undefined,
  cacheBust?: string | number
): string | null {
  if (!logoUrl?.trim()) return null;
  const value = logoUrl.trim();
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
    return cacheBust ? `${value}${value.includes('?') ? '&' : '?'}v=${cacheBust}` : value;
  }
  const path = value.startsWith('/') ? value : `/${value}`;
  const base = `${getApiBase()}${path}`;
  return cacheBust ? `${base}?v=${cacheBust}` : base;
}
