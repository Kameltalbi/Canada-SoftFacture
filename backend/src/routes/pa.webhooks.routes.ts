import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { receivedInvoiceUpload } from '../lib/receivedInvoiceUpload.js';
import {
  ReceivedInvoiceImportError,
  importReceivedFacturXPdf,
} from '../services/receivedInvoiceImport.js';
import type { PaProvider } from '../generated/prisma/index.js';
import { logger } from '../lib/logger.js';

const router = Router();

const webhookBodySchema = z.object({
  organizationId: z.string().min(1),
  paExternalId: z.string().optional(),
  /** Base64 du PDF Factur-X (alternative au multipart file). */
  pdfBase64: z.string().optional(),
});

function resolvePaProvider(raw: string): PaProvider {
  const key = raw.toUpperCase();
  if (key === 'MOCK') return 'MOCK';
  return 'NONE';
}

function verifyWebhookSecret(req: Request): boolean {
  const expected = process.env.PA_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  const header = req.headers['x-pa-webhook-secret'];
  return typeof header === 'string' && header === expected;
}

/** Stub réception PA — à remplacer par le connecteur réel (signature, mapping org, etc.). */
router.post('/:provider/received', receivedInvoiceUpload.single('file'), async (req, res) => {
  if (!verifyWebhookSecret(req)) {
    return res.status(401).json({ error: 'Webhook non autorisé' });
  }

  const parsed = webhookBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'organizationId requis' });
  }

  let pdfBuffer: Buffer | undefined = req.file?.buffer;
  if (!pdfBuffer?.length && parsed.data.pdfBase64) {
    try {
      pdfBuffer = Buffer.from(parsed.data.pdfBase64, 'base64');
    } catch {
      return res.status(400).json({ error: 'pdfBase64 invalide' });
    }
  }
  if (!pdfBuffer?.length) {
    return res.status(400).json({ error: 'PDF Factur-X requis (file ou pdfBase64)' });
  }

  const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
  if (!org) return res.status(404).json({ error: 'Organisation introuvable' });

  const paProvider = resolvePaProvider(req.params.provider);

  try {
    const { row, buyerMismatch } = await importReceivedFacturXPdf({
      organizationId: parsed.data.organizationId,
      pdfBuffer,
      source: 'PA_WEBHOOK',
      paProvider,
      paExternalId: parsed.data.paExternalId ?? null,
    });

    logger.info(
      { receivedInvoiceId: row.id, organizationId: org.id, paProvider },
      'Facture fournisseur reçue via webhook PA'
    );

    return res.status(201).json({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      buyerMismatch,
    });
  } catch (e) {
    if (e instanceof ReceivedInvoiceImportError) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    throw e;
  }
});

export default router;
