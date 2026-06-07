import {
  buildEinvoiceXmlMock,
  type EinvoiceOperationNature,
  type EinvoiceXmlInput,
} from '@/lib/einvoice-xml-mock';
import { toNumber } from '@/lib/utils';

type InvoiceLike = {
  id: string;
  number: string;
  issueDate: Date;
  dueDate: Date | null;
  currency: string;
  operationNature?: EinvoiceOperationNature;
  vatOnDebits?: boolean;
  useDifferentDeliveryAddress?: boolean;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryCountry?: string | null;
  subtotalHt: unknown;
  vatTotal: unknown;
  totalTtc: unknown;
  company: {
    name: string;
    taxMatricule: string | null;
    address: string | null;
    city: string | null;
    country: string;
  };
  client: {
    name: string;
    siren?: string | null;
    taxId: string | null;
    address: string | null;
    city: string | null;
    country: string;
  };
  lines: {
    description: string;
    quantity: unknown;
    unitPriceHt: unknown;
    taxRate: unknown;
    lineTotalHt: unknown;
    lineVat: unknown;
    lineTotalTtc: unknown;
  }[];
};

function resolveClientSiren(client: {
  siren?: string | null;
  taxId?: string | null;
}): string | undefined {
  const raw = client.siren?.replace(/\D/g, '') ?? '';
  if (raw.length === 9) return raw;
  if (raw.length === 14) return raw.slice(0, 9);
  const fromTax = client.taxId?.replace(/\D/g, '') ?? '';
  if (fromTax.length >= 9) return fromTax.slice(0, 9);
  return undefined;
}

export function invoiceToEinvoiceXml(invoice: InvoiceLike): string {
  const input: EinvoiceXmlInput = {
    uuid: invoice.id,
    invoiceNumber: invoice.number,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : undefined,
    currency: invoice.currency,
    operationNature: invoice.operationNature ?? 'SERVICES',
    vatOnDebits: invoice.vatOnDebits ?? false,
    supplier: {
      name: invoice.company.name,
      taxMatricule: invoice.company.taxMatricule ?? undefined,
      address: invoice.company.address ?? undefined,
      city: invoice.company.city ?? undefined,
      country: invoice.company.country,
    },
    customer: {
      name: invoice.client.name,
      siren: resolveClientSiren(invoice.client),
      taxId: invoice.client.taxId ?? undefined,
      address: invoice.client.address ?? undefined,
      city: invoice.client.city ?? undefined,
      country: invoice.client.country,
    },
    delivery:
      invoice.useDifferentDeliveryAddress && invoice.deliveryAddress?.trim()
        ? {
            address: invoice.deliveryAddress.trim(),
            city: invoice.deliveryCity ?? undefined,
            country: invoice.deliveryCountry ?? invoice.client.country,
          }
        : undefined,
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: String(toNumber(l.quantity)),
      unitCode: 'C62',
      unitPriceHt: String(toNumber(l.unitPriceHt)),
      taxRatePercent: String(toNumber(l.taxRate)),
      lineHt: String(toNumber(l.lineTotalHt)),
      lineVat: String(toNumber(l.lineVat)),
      lineTtc: String(toNumber(l.lineTotalTtc)),
    })),
    totals: {
      subtotalHt: String(toNumber(invoice.subtotalHt)),
      vatTotal: String(toNumber(invoice.vatTotal)),
      totalTtc: String(toNumber(invoice.totalTtc)),
    },
  };
  return buildEinvoiceXmlMock(input);
}
