/** Évite d’envoyer des data URLs volumineuses dans les réponses JSON (session, sidebar). */
export function logoUrlForApi(logoUrl: string | null | undefined): string | null {
  if (!logoUrl?.trim()) return null;
  const value = logoUrl.trim();
  if (value.startsWith('data:') && value.length > 512) return null;
  return value;
}
