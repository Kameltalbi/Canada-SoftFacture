import { APP_BRAND } from './app-brand';

/**
 * Informations légales — société Nexiora, marque SoftFacture France.
 * À renseigner via variables d'environnement avant mise en production.
 */
export const LEGAL_SITE = {
  /** Marque commerciale du service de facturation */
  brand: process.env.NEXT_PUBLIC_LEGAL_BRAND ?? APP_BRAND,
  /** Société éditrice (personne morale) */
  companyName: process.env.NEXT_PUBLIC_LEGAL_COMPANY_NAME ?? 'Nexiora',
  legalForm: process.env.NEXT_PUBLIC_LEGAL_LEGAL_FORM ?? 'SAS',
  addressLine1:
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE1 ?? '[Adresse du siège social — à compléter]',
  addressLine2:
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE2 ?? '[Code postal et ville — à compléter]',
  country: 'France',
  siret: process.env.NEXT_PUBLIC_LEGAL_SIRET ?? '[SIRET 14 chiffres — à compléter]',
  vatNumber: process.env.NEXT_PUBLIC_LEGAL_VAT ?? '[N° TVA intracommunautaire — à compléter]',
  rcs: process.env.NEXT_PUBLIC_LEGAL_RCS ?? '[RCS — ville et numéro — à compléter]',
  shareCapital: process.env.NEXT_PUBLIC_LEGAL_CAPITAL ?? '[Capital social — à compléter]',
  director: process.env.NEXT_PUBLIC_LEGAL_DIRECTOR ?? '[Directeur de la publication — à compléter]',
  contactEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? 'contact@softfacture.fr',
  hostName: process.env.NEXT_PUBLIC_LEGAL_HOST_NAME ?? '[Hébergeur — à compléter]',
  hostAddress: process.env.NEXT_PUBLIC_LEGAL_HOST_ADDRESS ?? '[Adresse hébergeur — à compléter]',
  lastUpdated: '29 mai 2026',
} as const;

export function formatLegalAddress(): string {
  const { addressLine1, addressLine2, country } = LEGAL_SITE;
  return `${addressLine1}, ${addressLine2}, ${country}`;
}

/** Ex. « SoftFacture France est une marque de Nexiora » */
export function brandOfCompanySentence(): string {
  return `${LEGAL_SITE.brand} est une marque de ${LEGAL_SITE.companyName}.`;
}

export function companyLegalLabel(): string {
  const form = LEGAL_SITE.legalForm?.trim();
  return form ? `${LEGAL_SITE.companyName} (${form})` : LEGAL_SITE.companyName;
}
