import { APP_BRAND } from './app-brand';

/**
 * Informations légales — marché canadien (Québec).
 * À renseigner via variables d'environnement avant mise en production.
 */
export const LEGAL_SITE = {
  /** Marque commerciale du service de facturation */
  brand: process.env.NEXT_PUBLIC_LEGAL_BRAND ?? APP_BRAND,
  /** Société éditrice (personne morale) */
  companyName: process.env.NEXT_PUBLIC_LEGAL_COMPANY_NAME ?? 'Nexiora',
  /** Forme juridique : Inc., Ltée, SENC, etc. */
  legalForm: process.env.NEXT_PUBLIC_LEGAL_LEGAL_FORM ?? 'Inc.',
  addressLine1:
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE1 ?? '[Adresse du siège social — à compléter]',
  addressLine2:
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS_LINE2 ?? '[Code postal et ville — à compléter]',
  /** Province ou territoire */
  province: process.env.NEXT_PUBLIC_LEGAL_PROVINCE ?? 'Québec',
  country: 'Canada',
  /** NEQ (Numéro d'entreprise du Québec, 10 chiffres) */
  neq: process.env.NEXT_PUBLIC_LEGAL_NEQ ?? '[NEQ 10 chiffres — à compléter]',
  /** Numéro d'entreprise fédéral (Business Number, 9 chiffres) */
  bn: process.env.NEXT_PUBLIC_LEGAL_BN ?? '[BN 9 chiffres — à compléter]',
  /** Numéro de TPS (ex. 123456789 RT 0001) */
  tpsNumber: process.env.NEXT_PUBLIC_LEGAL_TPS ?? '[N° TPS — à compléter]',
  /** Numéro de TVQ (ex. 1234567890 TQ 0001) */
  tvqNumber: process.env.NEXT_PUBLIC_LEGAL_TVQ ?? '[N° TVQ — à compléter]',
  /** Registre des entreprises du Québec ou registre fédéral */
  registre: process.env.NEXT_PUBLIC_LEGAL_REGISTRE ?? '[Registre — à compléter]',
  director:
    process.env.NEXT_PUBLIC_LEGAL_DIRECTOR ?? '[Responsable de la publication — à compléter]',
  contactEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL ?? 'contact@softfacture.ca',
  /** Responsable de la protection des renseignements personnels (Loi 25) */
  dpoName: process.env.NEXT_PUBLIC_LEGAL_DPO_NAME ?? 'Omar Talbi',
  dpoEmail: process.env.NEXT_PUBLIC_LEGAL_DPO_EMAIL ?? 'vieprivee@softfacture.ca',
  hostName: process.env.NEXT_PUBLIC_LEGAL_HOST_NAME ?? '[Hébergeur — à compléter]',
  hostAddress: process.env.NEXT_PUBLIC_LEGAL_HOST_ADDRESS ?? '[Adresse hébergeur — à compléter]',
  lastUpdated: '7 juin 2026',
} as const;

export function formatLegalAddress(): string {
  const { addressLine1, addressLine2, province, country } = LEGAL_SITE;
  return `${addressLine1}, ${addressLine2}, ${province}, ${country}`;
}

/** Ex. « SoftFacture Canada est une marque de Nexiora Inc. » */
export function brandOfCompanySentence(): string {
  return `${LEGAL_SITE.brand} est une marque de ${companyLegalLabel()}.`;
}

export function companyLegalLabel(): string {
  const form = LEGAL_SITE.legalForm?.trim();
  return form ? `${LEGAL_SITE.companyName} ${form}` : LEGAL_SITE.companyName;
}
