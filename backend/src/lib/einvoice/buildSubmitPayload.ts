import type { Invoice, InvoiceLine, Client, Organization } from '../../generated/prisma/index.js';
import { resolveClientSiren } from './siren.js';
import type { EInvoiceSubmitPayload } from './paConnector.js';

type InvoiceWithRelations = Invoice & {
  client: Client;
  organization: Organization;
  lines: InvoiceLine[];
};

function dec(value: { toString(): string }): string {
  return value.toString();
}

export function buildEInvoiceSubmitPayload(invoice: InvoiceWithRelations): EInvoiceSubmitPayload {
  const siren = resolveClientSiren(invoice.client);
  if (!siren) {
    throw new Error('SIREN acheteur manquant — renseignez le SIREN du client');
  }
  if (!invoice.number) {
    throw new Error('La facture doit être validée avant transmission e-facture');
  }

  const payload: EInvoiceSubmitPayload = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : undefined,
    currency: invoice.currency,
    operationNature: invoice.operationNature,
    vatOnDebits: invoice.vatOnDebits,
    supplier: {
      name: invoice.organization.name,
      siret: invoice.organization.billingSiret ?? invoice.organization.taxMatricule ?? undefined,
      vatNumber: invoice.organization.billingVatNumber ?? undefined,
      address: invoice.organization.address ?? undefined,
      postalCode: invoice.organization.postalCode ?? undefined,
      city: invoice.organization.city ?? undefined,
      country: invoice.organization.country,
    },
    customer: {
      name: invoice.client.name,
      siren,
      siret: invoice.client.taxId ?? undefined,
      address: invoice.client.address ?? undefined,
      postalCode: invoice.client.postalCode ?? undefined,
      city: invoice.client.city ?? undefined,
      country: invoice.client.country,
    },
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: dec(l.quantity),
      unitPriceHt: dec(l.unitPriceHt),
      taxRatePercent: dec(l.taxRate),
      lineHt: dec(l.lineTotalHt),
      lineVat: dec(l.lineVat),
      lineTtc: dec(l.lineTotalTtc),
    })),
    totals: {
      subtotalHt: dec(invoice.subtotalHt),
      vatTotal: dec(invoice.vatTotal),
      totalTtc: dec(invoice.totalTtc),
    },
  };

  if (invoice.useDifferentDeliveryAddress && invoice.deliveryAddress?.trim()) {
    payload.delivery = {
      address: invoice.deliveryAddress.trim(),
      postalCode: invoice.deliveryPostalCode ?? undefined,
      city: invoice.deliveryCity ?? undefined,
      country: invoice.deliveryCountry ?? invoice.client.country,
    };
  }

  return payload;
}
