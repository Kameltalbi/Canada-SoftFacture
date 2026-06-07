import { buildXml, embedFacturX, Flavor, Profile } from '@stackforge-eu/factur-x';
import { prisma } from '../lib/db.js';
import { mapInvoiceToFacturXInput } from '../lib/einvoice/mapFacturXInput.js';
import { buildInvoicePdfInputFromRecord } from './invoicePdfPayload.js';
import { buildInvoicePdfBuffer } from './pdfInvoice.js';

export class FacturXGenerateError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'FacturXGenerateError';
  }
}

const invoiceInclude = {
  client: true,
  organization: true,
  appliedDeposit: { select: { number: true } },
  creditedInvoice: { select: { number: true } },
  lines: { orderBy: { sortOrder: 'asc' as const } },
};

async function loadInvoiceForFacturX(invoiceId: string, organizationId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: invoiceInclude,
  });
  if (!invoice) throw new FacturXGenerateError('Facture introuvable', 404);
  if (invoice.status === 'DRAFT' || !invoice.number) {
    throw new FacturXGenerateError(
      'Validez la facture (numéro définitif) avant export Factur-X',
      400
    );
  }
  if (invoice.status === 'CANCELLED') {
    throw new FacturXGenerateError('Facture annulée — export Factur-X indisponible', 400);
  }
  return invoice;
}

export async function generateFacturXPdf(invoiceId: string, organizationId: string) {
  const invoice = await loadInvoiceForFacturX(invoiceId, organizationId);

  let facturInput;
  try {
    facturInput = mapInvoiceToFacturXInput(invoice);
  } catch (e) {
    throw new FacturXGenerateError(e instanceof Error ? e.message : 'Données e-facture invalides');
  }

  const visualPdf = await buildInvoicePdfBuffer(buildInvoicePdfInputFromRecord(invoice));

  try {
    const result = await embedFacturX({
      pdf: visualPdf,
      input: facturInput,
      profile: Profile.EN16931,
      flavor: Flavor.FACTUR_X,
      validateBeforeEmbed: true,
      validateXsd: true,
      unembeddedFonts: 'warn',
    });

    const safeNumber = invoice.number!.replace(/[^\w.-]/g, '_');
    return {
      pdf: Buffer.from(result.pdf),
      xml: result.xml,
      filename: `${safeNumber}-factur-x.pdf`,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'Erreur Factur-X';
    throw new FacturXGenerateError(`Génération Factur-X échouée : ${detail}`, 422);
  }
}

export async function generateFacturXXml(invoiceId: string, organizationId: string) {
  const invoice = await loadInvoiceForFacturX(invoiceId, organizationId);

  let facturInput;
  try {
    facturInput = mapInvoiceToFacturXInput(invoice);
  } catch (e) {
    throw new FacturXGenerateError(e instanceof Error ? e.message : 'Données e-facture invalides');
  }

  try {
    const xml = buildXml(facturInput, Profile.EN16931, Flavor.FACTUR_X);
    const safeNumber = invoice.number!.replace(/[^\w.-]/g, '_');
    return {
      xml,
      filename: `${safeNumber}-factur-x.xml`,
    };
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'Erreur XML';
    throw new FacturXGenerateError(`Génération XML CII échouée : ${detail}`, 422);
  }
}
