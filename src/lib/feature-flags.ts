/**
 * Feature flags produit (lancement sept. 2026).
 * - einvoiceUi : PA, Factur-X, réception — NEXT_PUBLIC_FEATURES_EINVOICE=true
 * - localeSwitcher : sélecteur FR/EN — NEXT_PUBLIC_SHOW_LOCALE_SWITCHER=true
 */
export const FEATURES = {
  einvoiceUi: process.env.NEXT_PUBLIC_FEATURES_EINVOICE === 'true',
  localeSwitcher: process.env.NEXT_PUBLIC_SHOW_LOCALE_SWITCHER === 'true',
} as const;
