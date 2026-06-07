import { prisma } from '../lib/db.js';
import { buildEInvoiceSubmitPayload } from '../lib/einvoice/buildSubmitPayload.js';
import { getPaConnector } from '../lib/einvoice/getPaConnector.js';

export class EinvoiceTransmitError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'EinvoiceTransmitError';
  }
}

export async function transmitInvoiceToPa(invoiceId: string, organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new EinvoiceTransmitError('Organisation introuvable', 404);

  const provider = org.paProvider;
  const connector = getPaConnector(provider);
  if (!connector) {
    throw new EinvoiceTransmitError(
      'Aucune Plateforme Agréée connectée — configurez votre PA dans Paramètres → Modules',
      400
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: {
      client: true,
      organization: true,
      lines: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!invoice) throw new EinvoiceTransmitError('Facture introuvable', 404);
  if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
    throw new EinvoiceTransmitError('Seules les factures validées peuvent être transmises', 400);
  }

  const payload = buildEInvoiceSubmitPayload(invoice);
  const result = await connector.submitInvoice(payload, org.paAccountRef);

  const now = new Date();
  const transmission = await prisma.eInvoiceTransmission.create({
    data: {
      organizationId,
      invoiceId,
      paProvider: provider,
      status: result.status,
      paExternalId: result.externalId,
      lastError: result.errorMessage ?? null,
      depositedAt: result.status === 'DEPOSITED' ? now : null,
      rejectedAt: result.status === 'REJECTED' ? now : null,
    },
  });

  return transmission;
}

export async function listInvoiceTransmissions(invoiceId: string, organizationId: string) {
  return prisma.eInvoiceTransmission.findMany({
    where: { invoiceId, organizationId },
    orderBy: { createdAt: 'desc' },
  });
}
