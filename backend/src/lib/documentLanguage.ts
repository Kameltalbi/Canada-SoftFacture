import type { DocumentLanguage } from '../generated/prisma/index.js';

export type DocumentLangCode = 'fr' | 'en' | 'de' | 'es' | 'it';

const TO_PRISMA: Record<DocumentLangCode, DocumentLanguage> = {
  fr: 'FR',
  en: 'EN',
  de: 'DE',
  es: 'ES',
  it: 'IT',
};

const FROM_PRISMA: Record<DocumentLanguage, DocumentLangCode> = {
  FR: 'fr',
  EN: 'en',
  DE: 'de',
  ES: 'es',
  IT: 'it',
};

export function toPrismaDocumentLanguage(code: string): DocumentLanguage {
  const key = code.toLowerCase() as DocumentLangCode;
  return TO_PRISMA[key] ?? 'FR';
}

export function fromPrismaDocumentLanguage(lang: DocumentLanguage): DocumentLangCode {
  return FROM_PRISMA[lang] ?? 'fr';
}

export const documentLanguageSchema = ['fr', 'en', 'de', 'es', 'it'] as const;
