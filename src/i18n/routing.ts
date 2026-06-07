import { defineRouting } from 'next-intl/routing';

/**
 * Routage i18n FR-CA / EN-CA.
 * - localeDetection: true → le navigateur choisit automatiquement FR ou EN
 * - localePrefix: 'never' → URLs propres sans /fr/ ou /en/
 * - Pour forcer FR uniquement : NEXT_PUBLIC_SHOW_LOCALE_SWITCHER=false
 */
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'never',
  localeDetection: false,
});
