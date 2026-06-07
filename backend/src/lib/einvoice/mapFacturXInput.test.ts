import { describe, expect, it } from 'vitest';
import { Prisma } from '../../generated/prisma/index.js';
import { mapInvoiceToFacturXInput } from './mapFacturXInput.js';

function baseInvoice() {
  const now = new Date('2026-06-01');
  return {
    id: 'inv1',
    organizationId: 'org1',
    clientId: 'cli1',
    number: 'FAC-2026-0001',
    invoiceYear: 2026,
    sequenceNumber: 1,
    kind: 'STANDARD' as const,
    advanceDeduction: new Prisma.Decimal(0),
    netToPay: new Prisma.Decimal(120),
    appliedDepositId: null,
    issueDate: now,
    dueDate: new Date('2026-06-30'),
    status: 'VALIDATED' as const,
    currency: 'EUR',
    applyVat: true,
    applyFiscalStamp: false,
    fiscalStamp: new Prisma.Decimal(0),
    discountEnabled: false,
    discountRate: new Prisma.Decimal(0),
    showCurrencyOnLines: true,
    documentLanguage: 'FR' as const,
    notes: null,
    operationNature: 'SERVICES' as const,
    vatOnDebits: false,
    useDifferentDeliveryAddress: false,
    deliveryAddress: null,
    deliveryPostalCode: null,
    deliveryCity: null,
    deliveryCountry: null,
    subtotalHt: new Prisma.Decimal(100),
    vatTotal: new Prisma.Decimal(20),
    totalTtc: new Prisma.Decimal(120),
    quoteId: null,
    recurringInvoiceId: null,
    creditedInvoiceId: null,
    createdAt: now,
    updatedAt: now,
    client: {
      id: 'cli1',
      organizationId: 'org1',
      name: 'Client SA',
      email: null,
      phone: null,
      taxId: '12345678900012',
      siren: '123456789',
      isCompany: true,
      address: '1 rue Test',
      postalCode: '75001',
      city: 'Paris',
      country: 'FR',
      createdAt: now,
      updatedAt: now,
    },
    organization: {
      id: 'org1',
      name: 'Mon Entreprise',
      logoUrl: null,
      taxMatricule: '98765432100019',
      address: '10 av. République',
      city: 'Lyon',
      postalCode: '69001',
      country: 'FR',
      defaultCurrency: 'EUR',
      defaultVatRate: new Prisma.Decimal(20),
      invoicePrefix: 'FAC',
      invoiceSequence: 1,
      lastInvoiceYear: 2026,
      invoiceNumberFormat: '{PREFIX}-{YYYY}-{SEQ:4}',
      invoiceResetYearly: true,
      quotePrefix: 'DEV',
      quoteSequence: 0,
      lastQuoteYear: 0,
      quoteNumberFormat: '{PREFIX}-{YYYY}-{SEQ:4}',
      quoteResetYearly: true,
      depositPrefix: 'ACO',
      depositSequence: 0,
      lastDepositYear: 0,
      depositNumberFormat: '{PREFIX}-{YYYY}-{SEQ:4}',
      depositResetYearly: true,
      creditNotePrefix: 'AVR',
      creditNoteSequence: 0,
      lastCreditNoteYear: 0,
      creditNoteNumberFormat: '{PREFIX}-{YYYY}-{SEQ:4}',
      creditNoteResetYearly: true,
      subscriptionPlan: 'STARTER' as const,
      billingStatus: 'TRIAL' as const,
      billingProvider: 'NONE' as const,
      billingEmail: null,
      billingLegalName: null,
      billingSiret: '98765432100019',
      billingVatNumber: 'FR12987654321',
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      pendingSubscriptionPlan: null,
      invoicePdfTemplate: 'CLASSIC' as const,
      quotePdfTemplate: 'CLASSIC' as const,
      otherDocumentPdfTemplate: 'CLASSIC' as const,
      pdfPrimaryColor: '#0f766e',
      pdfFontFamily: 'Open Sans',
      pdfAppearance: null,
      invoicePdfAccentColor: null,
      quotePdfAccentColor: null,
      otherDocumentPdfAccentColor: null,
      documentFooterText: null,
      onboardingCompletedAt: now,
      vatOnDebitsEnabled: false,
      isMicroEntrepreneur: false,
      stockManagementEnabled: false,
      paProvider: 'NONE' as const,
      paAccountRef: null,
      paConnectedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    lines: [
      {
        id: 'l1',
        invoiceId: 'inv1',
        productId: null,
        description: 'Prestation',
        quantity: new Prisma.Decimal(1),
        unitPriceHt: new Prisma.Decimal(100),
        taxRate: new Prisma.Decimal(20),
        lineTotalHt: new Prisma.Decimal(100),
        lineVat: new Prisma.Decimal(20),
        lineTotalTtc: new Prisma.Decimal(120),
        sortOrder: 0,
      },
    ],
  };
}

describe('mapInvoiceToFacturXInput', () => {
  it('mappe SIREN acheteur et totaux EN 16931', () => {
    const input = mapInvoiceToFacturXInput(baseInvoice());
    expect(input.document.id).toBe('FAC-2026-0001');
    expect(input.buyer.legalOrganization?.id).toBe('123456789');
    expect(input.buyer.legalOrganization?.schemeID).toBe('0002');
    expect(input.totals.grandTotal).toBe(120);
    expect(input.lines).toHaveLength(1);
  });

  it('refuse sans SIREN acheteur', () => {
    const inv = baseInvoice();
    (inv.client as { siren: string | null; taxId: string | null }).siren = null;
    (inv.client as { siren: string | null; taxId: string | null }).taxId = null;
    expect(() => mapInvoiceToFacturXInput(inv)).toThrow(/SIREN/);
  });
});
