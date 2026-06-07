/**
 * Routes de signature électronique — TunTrust API DIGIGO
 *
 * POST /api/signatures/invoices/:id/sign   → Initier la signature d'une facture
 * POST /api/signatures/quotes/:id/sign     → Initier la signature d'un devis
 * GET  /api/signatures/sessions/:sessionId → Vérifier le statut d'une session
 * POST /api/signatures/callback            → Webhook callback de TunTrust
 * POST /api/signatures/verify              → Vérifier une signature
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import {
  getTunTrustService,
  TunTrustService,
  type SignatureFormat,
  type SignatureLevel,
} from '../services/tuntrust.js';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────

const signInvoiceSchema = z.object({
  signatureFormat: z.enum(['XAdES', 'PAdES', 'CAdES', 'ASiC']).default('PAdES'),
  signatureLevel: z.enum(['B-B', 'B-T', 'B-LT', 'B-LTA']).default('B-T'),
  signerPhone: z.string().min(8, 'Numéro de téléphone requis'),
});

const signQuoteSchema = z.object({
  signatureFormat: z.enum(['XAdES', 'PAdES', 'CAdES', 'ASiC']).default('PAdES'),
  signatureLevel: z.enum(['B-B', 'B-T', 'B-LT', 'B-LTA']).default('B-T'),
  signerPhone: z.string().min(8, 'Numéro de téléphone requis'),
});

// ─── Helpers ─────────────────────────────────────────────

function isTunTrustConfigured(): boolean {
  return !!(
    process.env.TUNTRUST_API_URL &&
    process.env.TUNTRUST_CLIENT_ID &&
    process.env.TUNTRUST_CLIENT_SECRET &&
    process.env.TUNTRUST_API_KEY &&
    process.env.TUNTRUST_CALLBACK_URL
  );
}

// ─── POST /invoices/:id/sign ─────────────────────────────

router.post('/invoices/:id/sign', async (req, res) => {
  try {
    if (!isTunTrustConfigured()) {
      res.status(503).json({
        error: 'Signature électronique non configurée',
        message:
          "Les variables TunTrust DIGIGO ne sont pas configurées. Contactez l'administrateur.",
      });
      return;
    }

    const parsed = signInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation', details: parsed.error.flatten() });
      return;
    }

    const { signatureFormat, signatureLevel, signerPhone } = parsed.data;
    const orgId = (req as unknown as { organizationId: string }).organizationId as string;
    const userId = (req as unknown as { userId: string }).userId as string;

    // Récupérer la facture
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, organizationId: orgId },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        client: true,
        organization: true,
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Facture introuvable' });
      return;
    }

    if (invoice.status !== 'VALIDATED') {
      res.status(400).json({ error: 'Seules les factures validées peuvent être signées' });
      return;
    }

    // Récupérer l'email du signataire
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }

    // Calculer le hash du document
    const documentContent = JSON.stringify({
      id: invoice.id,
      number: invoice.number,
      issueDate: invoice.issueDate,
      totalTtc: invoice.totalTtc,
      lines: invoice.lines,
      client: invoice.client?.name,
      organization: invoice.organization?.name,
    });

    const documentHash = TunTrustService.computeHash(documentContent, 'SHA-256');

    // Initier la signature via TunTrust
    const tunTrust = getTunTrustService();
    const session = await tunTrust.initiateSignature({
      documentHash,
      hashAlgorithm: 'SHA-256',
      signatureFormat: signatureFormat as SignatureFormat,
      signatureLevel: signatureLevel as SignatureLevel,
      signerId: user.email,
      signerPhone,
      documentMetadata: {
        type: 'INVOICE',
        number: invoice.number ?? invoice.id,
        issueDate: invoice.issueDate.toISOString().slice(0, 10),
      },
    });

    logger.info(
      { sessionId: session.sessionId, invoiceId: invoice.id },
      'Signature session initiated for invoice'
    );

    res.json({
      sessionId: session.sessionId,
      authRedirectUrl: session.authRedirectUrl,
      status: session.status,
      expiresAt: session.expiresAt,
      message: "Veuillez compléter l'authentification 2FA (PIN + SMS OTP)",
    });
  } catch (err) {
    logger.error({ err }, 'Error initiating invoice signature');
    res.status(500).json({ error: "Erreur lors de l'initiation de la signature" });
  }
});

// ─── POST /quotes/:id/sign ──────────────────────────────

router.post('/quotes/:id/sign', async (req, res) => {
  try {
    if (!isTunTrustConfigured()) {
      res.status(503).json({
        error: 'Signature électronique non configurée',
        message: 'Les variables TunTrust DIGIGO ne sont pas configurées.',
      });
      return;
    }

    const parsed = signQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation', details: parsed.error.flatten() });
      return;
    }

    const { signatureFormat, signatureLevel, signerPhone } = parsed.data;
    const orgId = (req as unknown as { organizationId: string }).organizationId as string;
    const userId = (req as unknown as { userId: string }).userId as string;

    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, organizationId: orgId },
      include: {
        lines: { orderBy: { sortOrder: 'asc' } },
        client: true,
        organization: true,
      },
    });

    if (!quote) {
      res.status(404).json({ error: 'Devis introuvable' });
      return;
    }

    if (quote.status !== 'SENT') {
      res.status(400).json({ error: 'Seuls les devis envoyés peuvent être signés' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Utilisateur introuvable' });
      return;
    }

    const documentContent = JSON.stringify({
      id: quote.id,
      number: quote.number,
      issueDate: quote.issueDate,
      totalTtc: quote.totalTtc,
      lines: quote.lines,
      client: quote.client?.name,
      organization: quote.organization?.name,
    });

    const documentHash = TunTrustService.computeHash(documentContent, 'SHA-256');

    const tunTrust = getTunTrustService();
    const session = await tunTrust.initiateSignature({
      documentHash,
      hashAlgorithm: 'SHA-256',
      signatureFormat: signatureFormat as SignatureFormat,
      signatureLevel: signatureLevel as SignatureLevel,
      signerId: user.email,
      signerPhone,
      documentMetadata: {
        type: 'QUOTE',
        number: quote.number ?? quote.id,
        issueDate: quote.issueDate.toISOString().slice(0, 10),
      },
    });

    logger.info(
      { sessionId: session.sessionId, quoteId: quote.id },
      'Signature session initiated for quote'
    );

    res.json({
      sessionId: session.sessionId,
      authRedirectUrl: session.authRedirectUrl,
      status: session.status,
      expiresAt: session.expiresAt,
      message: "Veuillez compléter l'authentification 2FA (PIN + SMS OTP)",
    });
  } catch (err) {
    logger.error({ err }, 'Error initiating quote signature');
    res.status(500).json({ error: "Erreur lors de l'initiation de la signature" });
  }
});

// ─── GET /sessions/:sessionId ────────────────────────────

router.get('/sessions/:sessionId', async (req, res) => {
  try {
    if (!isTunTrustConfigured()) {
      res.status(503).json({ error: 'Signature électronique non configurée' });
      return;
    }

    const tunTrust = getTunTrustService();
    const result = await tunTrust.getSignatureStatus(req.params.sessionId);

    res.json(result);
  } catch (err) {
    logger.error({ err, sessionId: req.params.sessionId }, 'Error checking signature status');
    res.status(500).json({ error: 'Erreur lors de la vérification du statut' });
  }
});

// ─── POST /callback ──────────────────────────────────────

router.post('/callback', async (req, res) => {
  try {
    const { sessionId, status, signatureValue } = req.body;

    logger.info({ sessionId, status }, 'TunTrust callback received');

    if (status === 'SIGNED' && signatureValue) {
      // TODO: Stocker la signature dans la base de données
      // TODO: Mettre à jour le statut du document (facture/devis)
      // TODO: Générer le document signé (PAdES PDF ou XAdES XML)
      logger.info({ sessionId }, 'Document signed successfully via TunTrust');
    } else if (status === 'FAILED' || status === 'EXPIRED') {
      logger.warn({ sessionId, status }, 'Signature session failed or expired');
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Error processing TunTrust callback');
    res.status(500).json({ error: 'Erreur callback' });
  }
});

// ─── POST /verify ────────────────────────────────────────

router.post('/verify', async (req, res) => {
  try {
    if (!isTunTrustConfigured()) {
      res.status(503).json({ error: 'Signature électronique non configurée' });
      return;
    }

    const schema = z.object({
      documentHash: z.string(),
      signatureValue: z.string(),
      signatureFormat: z.enum(['XAdES', 'PAdES', 'CAdES', 'ASiC']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation', details: parsed.error.flatten() });
      return;
    }

    const tunTrust = getTunTrustService();
    const result = await tunTrust.verifySignature(parsed.data);

    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Error verifying signature');
    res.status(500).json({ error: 'Erreur lors de la vérification' });
  }
});

// ─── GET /status ─────────────────────────────────────────

router.get('/status', (_req, res) => {
  res.json({
    configured: isTunTrustConfigured(),
    provider: 'TunTrust',
    api: 'DIGIGO (SCAL 2)',
    supportedFormats: ['XAdES', 'PAdES', 'CAdES', 'ASiC'],
    supportedLevels: ['B-B', 'B-T', 'B-LT', 'B-LTA'],
  });
});

export default router;
