/**
 * Feature flags produit.
 * - einvoiceUi    : e-facture (désactivé pour le Canada) — NEXT_PUBLIC_FEATURES_EINVOICE=true
 * - localeSwitcher: sélecteur FR-CA/EN-CA — activé par défaut, désactiver avec =false
 */
export const FEATURES = {
  einvoiceUi: process.env.NEXT_PUBLIC_FEATURES_EINVOICE === 'true',
  localeSwitcher: process.env.NEXT_PUBLIC_SHOW_LOCALE_SWITCHER !== 'false',
} as const;
