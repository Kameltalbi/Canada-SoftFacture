import { randomUUID } from 'node:crypto';
import { extractXml } from '@stackforge-eu/factur-x';
import { Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/db.js';
import { normalizeSiren } from '../lib/einvoice/siren.js';
import { parseCiiInvoiceSummary } from '../lib/einvoice/parseCiiSummary.js';
import { deleteReceivedPdf, saveReceivedPdf } from '../lib/einvoice/receivedInvoiceStorage.js';
import type { PaProvider, ReceivedInvoiceSource } from '../generated/prisma/index.js';

export class ReceivedInvoiceImportError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'ReceivedInvoiceImportError';
  }
}

function orgSiren(org: {
  billingSiret: string | null;
  taxMatricule: string | null;
}): string | null {
  return normalizeSiren(org.billingSiret) ?? normalizeSiren(org.taxMatricule);
}

export type ImportReceivedInvoiceOptions = {
  organizationId: string;
  pdfBuffer: Buffer;
  source?: ReceivedInvoiceSource;
  paProvider?: PaProvider;
  paExternalId?: string | null;
};

export async function importReceivedFacturXPdf(options: ImportReceivedInvoiceOptions) {
  const org = await prisma.organization.findUnique({ where: { id: options.organizationId } });
  if (!org) throw new ReceivedInvoiceImportError('Organisation introuvable', 404);

  let extracted;
  try {
    extracted = await extractXml(options.pdfBuffer);
  } catch {
    throw new ReceivedInvoiceImportError(
      'Fichier invalide — importez un PDF Factur-X / ZUGFeRD avec XML embarqué',
      422
    );
  }

  const summary = parseCiiInvoiceSummary(extracted.xml);
  const tenantSiren = orgSiren(org);
  const buyerMismatch = Boolean(
    tenantSiren && summary.buyerSiren && summary.buyerSiren !== tenantSiren
  );

  const supplierKey = summary.supplierSiren ?? 'UNKNOWN';

  const existing = await prisma.receivedInvoice.findFirst({
    where: {
      organizationId: options.organizationId,
      invoiceNumber: summary.invoiceNumber,
      ...(summary.supplierSiren
        ? { supplierSiren: summary.supplierSiren }
        : { supplierSiren: null, supplierName: summary.supplierName }),
    },
  });
  if (existing) {
    throw new ReceivedInvoiceImportError(
      `Facture déjà reçue : ${summary.invoiceNumber} (${summary.supplierName})`,
      409
    );
  }

  const id = randomUUID();
  const pdfFilename = `${id}.pdf`;

  await saveReceivedPdf(options.organizationId, pdfFilename, options.pdfBuffer);

  try {
    const row = await prisma.receivedInvoice.create({
      data: {
        id,
        organizationId: options.organizationId,
        source: options.source ?? 'UPLOAD',
        paProvider: options.paProvider ?? 'NONE',
        paExternalId: options.paExternalId ?? null,
        invoiceNumber: summary.invoiceNumber,
        issueDate: summary.issueDate,
        dueDate: summary.dueDate,
        currency: summary.currency,
        supplierName: summary.supplierName,
        supplierSiren: summary.supplierSiren,
        supplierSiret: summary.supplierSiret,
        supplierVat: summary.supplierVat,
        buyerName: summary.buyerName,
        buyerSiren: summary.buyerSiren,
        subtotalHt: new Prisma.Decimal(summary.subtotalHt),
        vatTotal: new Prisma.Decimal(summary.vatTotal),
        totalTtc: new Prisma.Decimal(summary.totalTtc),
        facturXProfile: extracted.profile ?? null,
        pdfFilename,
        xmlContent: extracted.xml,
        buyerMismatch,
      },
    });

    return { row, buyerMismatch, profile: extracted.profile, supplierKey };
  } catch (e) {
    await deleteReceivedPdf(options.organizationId, pdfFilename);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ReceivedInvoiceImportError('Facture fournisseur déjà enregistrée', 409);
    }
    throw e;
  }
}
