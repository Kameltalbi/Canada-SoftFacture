import type { PdfDocumentTemplate } from '../generated/prisma/index.js';
import { normalizeHexColor } from './pdfPlanConfig.js';

export type PdfDocKind = 'invoice' | 'quote' | 'other';

export type OrgPdfColors = {
  pdfPrimaryColor: string;
  invoicePdfAccentColor?: string | null;
  quotePdfAccentColor?: string | null;
  otherDocumentPdfAccentColor?: string | null;
};

export function resolvePdfAccent(org: OrgPdfColors, docKind: PdfDocKind): string {
  const perDoc =
    docKind === 'invoice'
      ? org.invoicePdfAccentColor
      : docKind === 'quote'
        ? org.quotePdfAccentColor
        : org.otherDocumentPdfAccentColor;
  return normalizeHexColor(perDoc ?? org.pdfPrimaryColor);
}

/** Couleur d'en-tête de tableau selon le gabarit (teinte dérivée ou fixe). */
export function tableHeaderColor(template: PdfDocumentTemplate, accent: string): string {
  if (template === 'MODERN') return accent;
  if (template === 'MINIMAL' || template === 'MONO') return '#2f2f2f';
  if (template === 'BLUE_PRO') return '#2563eb';
  return accent;
}
