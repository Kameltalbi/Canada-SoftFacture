import { defineRouting } from 'next-intl/routing';

/** Interface FR + EN. Les langues PDF (factures/devis) sont gérées à part (documentLanguage). */
const localeSwitcherEnabled = process.env.NEXT_PUBLIC_SHOW_LOCALE_SWITCHER === 'true';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'never',
  /** Au lancement FR : pas de détection navigateur tant que le switcher est masqué. */
  localeDetection: localeSwitcherEnabled,
});
