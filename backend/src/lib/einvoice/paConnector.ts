import type { EInvoiceTransmissionStatus, PaProvider } from '../../generated/prisma/index.js';

/** Données structurées EN 16931 prêtes pour transmission PA. */
export type EInvoiceSubmitPayload = {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  operationNature: 'GOODS' | 'SERVICES' | 'MIXED';
  vatOnDebits: boolean;
  supplier: {
    name: string;
    siret?: string;
    vatNumber?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country: string;
  };
  customer: {
    name: string;
    siren: string;
    siret?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country: string;
  };
  delivery?: {
    address: string;
    postalCode?: string;
    city?: string;
    country: string;
  };
  lines: {
    description: string;
    quantity: string;
    unitPriceHt: string;
    taxRatePercent: string;
    lineHt: string;
    lineVat: string;
    lineTtc: string;
  }[];
  totals: { subtotalHt: string; vatTotal: string; totalTtc: string };
};

export type PaSubmitResult = {
  externalId: string;
  status: Extract<EInvoiceTransmissionStatus, 'DEPOSITED' | 'REJECTED'>;
  errorMessage?: string;
};

export type PaStatusResult = {
  status: EInvoiceTransmissionStatus;
  errorMessage?: string;
};

/** Contrat OD → Plateforme Agréée. */
export interface PaConnector {
  readonly provider: PaProvider;
  submitInvoice(
    payload: EInvoiceSubmitPayload,
    accountRef?: string | null
  ): Promise<PaSubmitResult>;
  getTransmissionStatus(externalId: string, accountRef?: string | null): Promise<PaStatusResult>;
}
