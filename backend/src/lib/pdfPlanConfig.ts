import type { PdfDocumentTemplate, SubscriptionPlan } from '../generated/prisma/index.js';

export const ALL_PDF_TEMPLATES: PdfDocumentTemplate[] = [
  'CLASSIC',
  'MODERN',
  'MINIMAL',
  'MONO',
  'BLUE_PRO',
];

export type PdfPlanLimits = {
  /** Nombre de gabarits distincts disponibles */
  maxTemplates: number;
  /** Un seul gabarit pour facture, devis et autre document */
  unifiedTemplate: boolean;
  /** Choix d'une couleur d'accent (code hex) */
  allowAccentColor: boolean;
  /** Couleur différente par type de document */
  perDocumentAccentColor: boolean;
  /** Gabarits autorisés pour ce plan */
  allowedTemplates: PdfDocumentTemplate[];
};

export const PLAN_PDF_LIMITS: Record<SubscriptionPlan, PdfPlanLimits> = {
  STARTER: {
    maxTemplates: 1,
    unifiedTemplate: true,
    allowAccentColor: false,
    perDocumentAccentColor: false,
    allowedTemplates: ['CLASSIC'],
  },
  PRO: {
    maxTemplates: 2,
    unifiedTemplate: true,
    allowAccentColor: true,
    perDocumentAccentColor: false,
    allowedTemplates: ['CLASSIC', 'MODERN', 'MONO', 'BLUE_PRO'],
  },
  BUSINESS: {
    maxTemplates: 3,
    unifiedTemplate: false,
    allowAccentColor: true,
    perDocumentAccentColor: true,
    allowedTemplates: ['CLASSIC', 'MODERN', 'MINIMAL', 'MONO', 'BLUE_PRO'],
  },
};

export type OrgPdfSettings = {
  subscriptionPlan: SubscriptionPlan;
  invoicePdfTemplate: PdfDocumentTemplate;
  quotePdfTemplate: PdfDocumentTemplate;
  otherDocumentPdfTemplate: PdfDocumentTemplate;
  pdfPrimaryColor: string;
  invoicePdfAccentColor: string | null;
  quotePdfAccentColor: string | null;
  otherDocumentPdfAccentColor: string | null;
};

export type PdfSettingsPatch = Partial<{
  invoicePdfTemplate: PdfDocumentTemplate;
  quotePdfTemplate: PdfDocumentTemplate;
  otherDocumentPdfTemplate: PdfDocumentTemplate;
  pdfPrimaryColor: string;
  invoicePdfAccentColor: string | null;
  quotePdfAccentColor: string | null;
  otherDocumentPdfAccentColor: string | null;
}>;

const HEX_RE = /^#?[0-9A-Fa-f]{6}$/;

export function normalizeHexColor(input: string | null | undefined, fallback = '#0f766e'): string {
  if (!input?.trim()) return fallback;
  const v = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(v)) return `#${v.toLowerCase()}`;
  return fallback;
}

function pickAllowed(
  value: PdfDocumentTemplate,
  allowed: PdfDocumentTemplate[]
): PdfDocumentTemplate {
  return allowed.includes(value) ? value : allowed[0];
}

/** Applique les règles du plan et retourne les champs PDF à enregistrer. */
export function sanitizePdfSettingsPatch(
  org: OrgPdfSettings,
  patch: PdfSettingsPatch
): PdfSettingsPatch {
  const limits = PLAN_PDF_LIMITS[org.subscriptionPlan];
  const allowed = limits.allowedTemplates;

  let invoice = pickAllowed(patch.invoicePdfTemplate ?? org.invoicePdfTemplate, allowed);
  let quote = pickAllowed(patch.quotePdfTemplate ?? org.quotePdfTemplate, allowed);
  let other = pickAllowed(patch.otherDocumentPdfTemplate ?? org.otherDocumentPdfTemplate, allowed);

  if (limits.unifiedTemplate) {
    const master =
      patch.invoicePdfTemplate ??
      patch.quotePdfTemplate ??
      patch.otherDocumentPdfTemplate ??
      org.invoicePdfTemplate;
    const unified = pickAllowed(master, allowed);
    invoice = quote = other = unified;
  }

  const result: PdfSettingsPatch = {
    invoicePdfTemplate: invoice,
    quotePdfTemplate: quote,
    otherDocumentPdfTemplate: other,
  };

  if (limits.allowAccentColor) {
    const primary = normalizeHexColor(patch.pdfPrimaryColor ?? org.pdfPrimaryColor);
    result.pdfPrimaryColor = primary;
    if (limits.perDocumentAccentColor) {
      if (patch.invoicePdfAccentColor !== undefined) {
        result.invoicePdfAccentColor = patch.invoicePdfAccentColor
          ? normalizeHexColor(patch.invoicePdfAccentColor)
          : null;
      }
      if (patch.quotePdfAccentColor !== undefined) {
        result.quotePdfAccentColor = patch.quotePdfAccentColor
          ? normalizeHexColor(patch.quotePdfAccentColor)
          : null;
      }
      if (patch.otherDocumentPdfAccentColor !== undefined) {
        result.otherDocumentPdfAccentColor = patch.otherDocumentPdfAccentColor
          ? normalizeHexColor(patch.otherDocumentPdfAccentColor)
          : null;
      }
    } else {
      result.invoicePdfAccentColor = null;
      result.quotePdfAccentColor = null;
      result.otherDocumentPdfAccentColor = null;
    }
  }

  return result;
}
