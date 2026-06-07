import type { InvoicePreviewData } from '@/components/invoices/invoice-preview-document';
import type { QuotePreviewData } from '@/components/invoices/quote-preview-document';

type OrgPreviewFields = {
  name: string;
  taxMatricule?: string | null;
  address?: string | null;
  city?: string | null;
  defaultCurrency?: string;
  slogan?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};

const SAMPLE_SLOGAN = 'Votre partenaire de confiance';
const SAMPLE_PHONE = '01 23 45 67 89';
const SAMPLE_EMAIL = 'contact@monentreprise.fr';
const SAMPLE_WEBSITE = 'www.monentreprise.fr';

export function buildSampleQuotePreview(org: OrgPreviewFields): QuotePreviewData {
  const currency = org.defaultCurrency ?? 'CAD';
  const today = new Date().toISOString().slice(0, 10);
  const valid = new Date();
  valid.setDate(valid.getDate() + 30);

  return {
    number: 'DEV-2026-0001',
    issueDate: today,
    validUntil: valid.toISOString().slice(0, 10),
    companyName: org.name || 'Mon entreprise',
    companyTax: org.taxMatricule,
    companyAddress: org.address,
    companyCity: org.city,
    companySlogan: org.slogan ?? SAMPLE_SLOGAN,
    companyPhone: org.phone ?? SAMPLE_PHONE,
    companyEmail: org.email ?? SAMPLE_EMAIL,
    companyWebsite: org.website ?? SAMPLE_WEBSITE,
    clientName: 'Client exemple SARL',
    clientTax: '1234567A',
    clientAddress: '12 rue de la République',
    clientCity: '75001 Paris',
    subject: 'Travaux de rénovation',
    notes: 'Validité du devis : 30 jours. Acompte de 30 % à la commande.',
    currency,
    applyVat: true,
    lines: [
      {
        description: "Main d'œuvre — pose carrelage",
        quantity: 24,
        unitPriceHt: 45,
        taxRate: 20,
        lineTotalHt: 1080,
      },
      {
        description: 'Fourniture carrelage grès cérame',
        quantity: 48,
        unitPriceHt: 28.5,
        taxRate: 20,
        lineTotalHt: 1368,
      },
    ],
    subtotalHt: 2448,
    vatTotal: 366.18,
    tpsTotal: 122.4,
    tvqTotal: 243.78,
    totalTtc: 2814.18,
    netToPay: 2814.18,
    labels: {
      client: 'Client',
      designation: 'Désignation',
      qty: 'Qté.',
      unit: 'Unité',
      unitPrice: 'Prix U. HT',
      totalHt: 'Total HT',
      subtotalHt: 'Total HT',
      vat: 'Taxes',
      totalTtc: 'Total TTC',
      netToPay: 'Net à payer',
      issueDate: 'Date',
      validUntil: "Valable jusqu'au",
    },
  };
}

export function buildSampleInvoicePreview(org: OrgPreviewFields): InvoicePreviewData {
  const currency = org.defaultCurrency ?? 'CAD';
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date();
  due.setDate(due.getDate() + 30);

  return {
    documentTitle: 'FACTURE',
    number: 'FAC-2026-0001',
    issueDate: today,
    dueDate: due.toISOString().slice(0, 10),
    companyName: org.name || 'Mon entreprise',
    companyTax: org.taxMatricule,
    companyAddress: org.address,
    companyCity: org.city,
    companySlogan: org.slogan ?? SAMPLE_SLOGAN,
    companyPhone: org.phone ?? SAMPLE_PHONE,
    companyEmail: org.email ?? SAMPLE_EMAIL,
    companyWebsite: org.website ?? SAMPLE_WEBSITE,
    clientName: 'Client exemple SARL',
    clientTax: '1234567A',
    clientAddress: '12 rue de la République',
    clientCity: '75001 Paris',
    subject: 'Travaux de rénovation',
    notes: 'Paiement par virement sous 30 jours.',
    currency,
    applyVat: true,
    lines: [
      {
        description: "Main d'œuvre — pose carrelage",
        quantity: 24,
        unitPriceHt: 45,
        taxRate: 20,
        lineTotalHt: 1080,
      },
      {
        description: 'Fourniture carrelage grès cérame',
        quantity: 48,
        unitPriceHt: 28.5,
        taxRate: 20,
        lineTotalHt: 1368,
      },
    ],
    subtotalHt: 2448,
    vatTotal: 366.18,
    tpsTotal: 122.4,
    tvqTotal: 243.78,
    totalTtc: 2814.18,
    netToPay: 2814.18,
    labels: {
      client: 'Client',
      designation: 'Désignation',
      qty: 'Qté.',
      unit: 'Unité',
      unitPrice: 'Prix U. HT',
      totalHt: 'Total HT',
      subtotalHt: 'Total HT',
      vat: 'Taxes',
      totalTtc: 'Total TTC',
      advanceDeduction: 'Acompte déduit',
      netToPay: 'Net à payer',
      issueDate: 'Date',
      dueDate: 'Échéance',
      paymentMethods: 'Modes de règlement',
    },
  };
}

export function buildSampleOtherPreview(org: OrgPreviewFields): InvoicePreviewData {
  const data = buildSampleInvoicePreview(org);
  return {
    ...data,
    documentTitle: 'BON DE LIVRAISON',
    number: 'BL-2026-0001',
    dueDate: null,
    subject: 'Livraison chantier',
    notes: 'Marchandise livrée en parfait état.',
  };
}
