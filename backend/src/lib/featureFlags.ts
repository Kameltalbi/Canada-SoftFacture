/** API e-facture avancée (réception, webhooks PA). Désactivée au lancement — FEATURES_EINVOICE=true pour activer. */
export function isEinvoiceFeaturesEnabled(): boolean {
  return process.env.FEATURES_EINVOICE === 'true';
}
