import type { Client, Invoice, InvoiceLine, Organization } from '../generated/prisma/index.js';
import { APP_BRAND } from '../lib/appBrand.js';
import { fromPrismaDocumentLanguage } from '../lib/documentLanguage.js';
import { getDocumentPdfLabels } from '../lib/documentPdfLabels.js';
import { resolvePdfAccent } from '../lib/pdfTheme.js';
import type { InvoicePdfInput } from './pdfInvoice.js';

export type InvoicePdfSource = Invoice & {
  client: Client;
  organization: Organization;
  lines: InvoiceLine[];
  appliedDeposit?: { number: string | null } | null;
  creditedInvoice?: { number: string | null } | null;
};

/**
 * Construit le footer légal automatique.
 * Priorité : footer custom org > mentions légales auto > fallback brand.
 *
 * Mentions injectées :
 *  - Art. 293 B CGI  → si org.isMicroEntrepreneur
 *  - Art. L441-10 CCom → si client.isCompany (B2B)
 */
function buildLegalFooter(
  org: Organization,
  client: Client,
  dueDate: Date | null | undefined
): string {
  if (org.documentFooterText && org.documentFooterText.trim().length > 0) {
    return org.documentFooterText.trim();
  }

  const parts: string[] = [];

  if (org.isMicroEntrepreneur) {
    parts.push('TVA non applicable - article 293 B du CGI');
  }

  if (client.isCompany) {
    const due = dueDate
      ? dueDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : "à la date d'échéance";
    parts.push(
      `Date d'échéance : ${due}. Pénalités de retard applicables en cas de non-paiement : 3 fois le taux d'intérêt légal. En cas de retard de paiement, une indemnité forfaitaire de 40 € pour frais de recouvrement est due (Art. L441-10 du Code de commerce).`
    );
  }

  if (parts.length > 0) {
    return parts.join(' — ');
  }

  return `${APP_BRAND} — Document généré automatiquement.`;
}

export function buildInvoicePdfInputFromRecord(inv: InvoicePdfSource): InvoicePdfInput {
  const pdfLang = fromPrismaDocumentLanguage(inv.documentLanguage);
  const pdfLabels = getDocumentPdfLabels(pdfLang);

  const isMicroEntrepreneur = inv.organization.isMicroEntrepreneur ?? false;

  return {
    number: inv.number ?? pdfLabels.draft,
    kind: inv.kind,
    documentLanguage: pdfLang,
    issueDate: inv.issueDate,
    notes: inv.notes,
    currency: inv.currency,
    applyVat: isMicroEntrepreneur ? false : inv.applyVat,
    applyFiscalStamp: inv.applyFiscalStamp,
    fiscalStamp: inv.fiscalStamp.toString(),
    discountEnabled: inv.discountEnabled,
    discountRate: inv.discountRate.toString(),
    showCurrencyOnLines: inv.showCurrencyOnLines,
    advanceDeduction: inv.advanceDeduction.toString(),
    netToPay: (inv.netToPay ?? inv.totalTtc).toString(),
    appliedDepositNumber: inv.appliedDeposit?.number ?? null,
    creditedInvoiceNumber: inv.creditedInvoice?.number ?? null,
    template: inv.organization.invoicePdfTemplate,
    accentColor: resolvePdfAccent(inv.organization, 'invoice'),
    footerText: buildLegalFooter(inv.organization, inv.client, inv.dueDate),
    defaultFooterLine: `${APP_BRAND} — Document généré automatiquement.`,
    org: {
      name: inv.organization.name,
      logoUrl: inv.organization.logoUrl,
      taxMatricule: inv.organization.taxMatricule,
      address: inv.organization.address,
      city: inv.organization.city,
    },
    client: { name: inv.client.name, taxId: inv.client.taxId },
    lines: inv.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity.toString(),
      unitPriceHt: l.unitPriceHt.toString(),
      taxRate: isMicroEntrepreneur ? '0' : l.taxRate.toString(),
      lineTotalHt: l.lineTotalHt.toString(),
      lineVat: isMicroEntrepreneur ? '0' : l.lineVat.toString(),
      lineTotalTtc: isMicroEntrepreneur ? l.lineTotalHt.toString() : l.lineTotalTtc.toString(),
    })),
    subtotalHt: inv.subtotalHt.toString(),
    vatTotal: isMicroEntrepreneur ? '0' : inv.vatTotal.toString(),
    totalTtc: isMicroEntrepreneur ? inv.subtotalHt.toString() : inv.totalTtc.toString(),
  };
}
