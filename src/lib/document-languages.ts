/** Langues disponibles pour l'émission des documents (PDF). L'interface reste en français. */
export const DOCUMENT_LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
] as const;

export type DocumentLanguageCode = (typeof DOCUMENT_LANGUAGES)[number]['code'];

export const DEFAULT_DOCUMENT_LANGUAGE: DocumentLanguageCode = 'fr';

export function isDocumentLanguageCode(v: string): v is DocumentLanguageCode {
  return DOCUMENT_LANGUAGES.some((l) => l.code === v);
}
