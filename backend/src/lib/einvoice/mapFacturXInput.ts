import {
  DocumentTypeCode,
  UnitCode,
  VatCategoryCode,
  type FacturXInvoiceInput,
  type InvoiceLineInput,
  type VatBreakdownInput,
} from '@stackforge-eu/factur-x';
import type {
  Invoice,
  InvoiceLine,
  Client,
  Organization,
  InvoiceOperationNature,
} from '../../generated/prisma/index.js';
import { resolveClientSiren } from './siren.js';

type InvoiceWithRelations = Invoice & {
  client: Client;
  organization: Organization;
  lines: InvoiceLine[];
};

const OPERATION_LABEL: Record<InvoiceOperationNature, string> = {
  GOODS: 'Livraison de biens',
  SERVICES: 'Prestation de services',
  MIXED: 'Opération mixte (biens et services)',
};

function num(value: { toString(): string } | string | number): number {
  return typeof value === 'number' ? value : parseFloat(value.toString());
}

function addressLine(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : '—';
}

function sellerSiret(org: Organization): string | undefined {
  const raw = org.billingSiret ?? org.taxMatricule;
  if (!raw?.trim()) return undefined;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 9 ? digits : undefined;
}

function vatCategory(rate: number, applyVat: boolean): VatCategoryCode {
  if (!applyVat || rate === 0) return VatCategoryCode.EXEMPT;
  return VatCategoryCode.STANDARD_RATE;
}

function buildVatBreakdown(lines: InvoiceLine[], applyVat: boolean): VatBreakdownInput[] {
  const buckets = new Map<string, VatBreakdownInput>();

  for (const line of lines) {
    const rate = applyVat ? num(line.taxRate) : 0;
    const category = vatCategory(rate, applyVat);
    const key = `${category}:${rate}`;
    const existing = buckets.get(key);
    const taxable = num(line.lineTotalHt);
    const tax = num(line.lineVat);

    if (existing) {
      existing.taxableAmount += taxable;
      existing.taxAmount += tax;
    } else {
      buckets.set(key, {
        categoryCode: category,
        ratePercent: rate,
        taxableAmount: taxable,
        taxAmount: tax,
      });
    }
  }

  return Array.from(buckets.values()).map((row) => ({
    ...row,
    taxableAmount: Math.round(row.taxableAmount * 1000) / 1000,
    taxAmount: Math.round(row.taxAmount * 1000) / 1000,
  }));
}

function documentTypeCode(kind: Invoice['kind']): DocumentTypeCode {
  if (kind === 'CREDIT_NOTE') return DocumentTypeCode.CREDIT_NOTE;
  if (kind === 'DEPOSIT') return DocumentTypeCode.PREPAYMENT_INVOICE;
  return DocumentTypeCode.COMMERCIAL_INVOICE;
}

export function mapInvoiceToFacturXInput(invoice: InvoiceWithRelations): FacturXInvoiceInput {
  const siren = resolveClientSiren(invoice.client);
  if (!siren) {
    throw new Error('SIREN acheteur manquant — renseignez le SIREN du client');
  }
  if (!invoice.number) {
    throw new Error('La facture doit être validée avant export Factur-X');
  }

  const applyVat = invoice.applyVat;
  const lineTotal = num(invoice.subtotalHt);
  const taxTotal = num(invoice.vatTotal);
  const grandTotal = num(invoice.totalTtc);
  const advance = num(invoice.advanceDeduction);
  const duePayable = num(invoice.netToPay ?? invoice.totalTtc);

  const notes: { content: string }[] = [{ content: OPERATION_LABEL[invoice.operationNature] }];
  if (invoice.vatOnDebits) {
    notes.push({ content: 'TVA sur les débits' });
  }
  if (invoice.notes?.trim()) {
    notes.push({ content: invoice.notes.trim() });
  }

  const sellerRegistrations: FacturXInvoiceInput['seller']['taxRegistrations'] = [];
  const sellerVat = invoice.organization.billingVatNumber?.trim();
  if (sellerVat) {
    sellerRegistrations.push({ id: sellerVat.replace(/\s/g, ''), schemeId: 'VA' });
  }

  const siret = sellerSiret(invoice.organization);

  const facturLines: InvoiceLineInput[] = invoice.lines.map((line, index) => {
    const rate = applyVat ? num(line.taxRate) : 0;
    return {
      id: String(index + 1),
      name: line.description,
      description: line.description,
      quantity: num(line.quantity),
      unitCode: UnitCode.UNIT,
      unitPrice: num(line.unitPriceHt),
      lineTotal: num(line.lineTotalHt),
      vatCategoryCode: vatCategory(rate, applyVat),
      vatRatePercent: rate,
    };
  });

  const input: FacturXInvoiceInput = {
    document: {
      id: invoice.number,
      issueDate: invoice.issueDate.toISOString().slice(0, 10),
      typeCode: documentTypeCode(invoice.kind),
      dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : undefined,
      buyerReference: siren,
      notes,
    },
    seller: {
      name: invoice.organization.name,
      address: {
        line1: addressLine(invoice.organization.address),
        city: addressLine(invoice.organization.city),
        postalCode: addressLine(invoice.organization.postalCode),
        country: invoice.organization.country || 'FR',
      },
      taxRegistrations: sellerRegistrations.length ? sellerRegistrations : undefined,
      legalOrganization: siret ? { id: siret, schemeID: '0009' } : undefined,
    },
    buyer: {
      name: invoice.client.name,
      address: {
        line1: addressLine(invoice.client.address),
        city: addressLine(invoice.client.city),
        postalCode: addressLine(invoice.client.postalCode),
        country: invoice.client.country || 'FR',
      },
      legalOrganization: { id: siren, schemeID: '0002' },
    },
    lines: facturLines,
    totals: {
      lineTotal,
      taxBasisTotal: lineTotal,
      taxTotal,
      grandTotal,
      duePayableAmount: duePayable,
      currency: invoice.currency,
      prepaidAmount: advance > 0 ? advance : undefined,
    },
    vatBreakdown: buildVatBreakdown(invoice.lines, applyVat),
    payment: invoice.dueDate
      ? {
          meansCode: '58',
          dueDate: invoice.dueDate.toISOString().slice(0, 10),
          paymentReference: invoice.number,
        }
      : undefined,
  };

  if (invoice.useDifferentDeliveryAddress && invoice.deliveryAddress?.trim()) {
    input.delivery = {
      location: {
        line1: invoice.deliveryAddress.trim(),
        city: addressLine(invoice.deliveryCity),
        postalCode: addressLine(invoice.deliveryPostalCode),
        country: invoice.deliveryCountry ?? invoice.client.country ?? 'FR',
      },
    };
  }

  return input;
}
