/**
 * Routes de conformité Loi 25 / PIPEDA — accès ADMIN uniquement.
 *
 * POST /api/privacy/export              → Génère l'export portabilité (JSON + CSV)
 * GET  /api/privacy/audit-logs          → Consulte le registre d'audit
 * GET  /api/privacy/audit-logs/verify   → Vérifie l'intégrité de la chaîne
 * POST /api/privacy/delete-account      → Déclenche la demande de suppression (+90 j)
 * DELETE /api/privacy/delete-account    → Annule la demande de suppression
 * POST /api/privacy/incidents           → Déclare un incident (art. 3.5 Loi 25)
 * GET  /api/privacy/incidents           → Liste les incidents
 */

import { Router, type Request } from 'express';
import { collectTenantData, generateInvoicesCsv } from '../lib/privacy/dataExport.js';
import { logEvent } from '../lib/privacy/auditLogger.js';
import { verifyChainIntegrity } from '../lib/privacy/auditLogger.js';
import { requestAccountDeletion, cancelAccountDeletion } from '../lib/privacy/lifecyclePurge.js';
import { prisma } from '../lib/db.js';
import { z } from 'zod';

const router = Router();

// Helper : extrait l'org et l'acteur de la requête (middleware auth déjà appliqué)
const orgId = (req: Request) => (req as Express.Request).user!.organizationId!;
const actorId = (req: Request) => (req as Express.Request).user!.sub;
const actorEmail = (req: Request) => (req as Express.Request).user!.email ?? null;
const ip = (req: Request) =>
  (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
  req.socket?.remoteAddress ??
  null;

// ─────────────────────────────────────────────────────────────────
// Module 2 : Portabilité des données
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/privacy/export
 * Génère un export complet de l'organisation (JSON + CSV des factures).
 * Tracé dans le registre d'audit.
 *
 * Paramètres body :
 *   format: "json" | "csv" (défaut: "json")
 */
router.post('/export', async (req, res) => {
  const format = (req.body?.format as string) === 'csv' ? 'csv' : 'json';
  const currentOrgId = orgId(req);

  const data = await collectTenantData(currentOrgId);

  // Tracer l'export dans le registre immuable
  await logEvent({
    organizationId: currentOrgId,
    actorId: actorId(req),
    actorEmail: actorEmail(req),
    event: 'DATA_EXPORT',
    targetResource: `organization:${currentOrgId}`,
    details: {
      format,
      invoiceCount: data.invoices.length,
      clientCount: data.clients.length,
    },
    ipAddress: ip(req),
    userAgent: req.headers['user-agent'] ?? null,
  });

  if (format === 'csv') {
    const csv = generateInvoicesCsv(data.invoices);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="softfacture-export-${currentOrgId}-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.send(csv);
  }

  // Format JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="softfacture-export-${currentOrgId}-${new Date().toISOString().slice(0, 10)}.json"`
  );
  return res.json(data);
});

// ─────────────────────────────────────────────────────────────────
// Module 4 : Registre d'audit
// ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

/**
 * GET /api/privacy/audit-logs
 * Retourne les entrées du registre d'audit pour l'organisation.
 * Query params : limit (défaut 100), offset (défaut 0), event (filtre optionnel).
 */
router.get('/audit-logs', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;
  const eventFilter = req.query.event as string | undefined;

  const logs = await db.dataAccessLog.findMany({
    where: {
      organizationId: orgId(req),
      ...(eventFilter ? { event: eventFilter } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    select: {
      id: true,
      actorEmail: true,
      event: true,
      targetResource: true,
      details: true,
      ipAddress: true,
      createdAt: true,
      rowHash: true,
    },
  });

  const total = await db.dataAccessLog.count({
    where: { organizationId: orgId(req) },
  });

  return res.json({ logs, total, limit, offset });
});

/**
 * GET /api/privacy/audit-logs/verify
 * Vérifie l'intégrité cryptographique de la chaîne de logs.
 * Utilisé pour les audits CAI (Commission d'accès à l'information).
 */
router.get('/audit-logs/verify', async (req, res) => {
  const result = await verifyChainIntegrity(orgId(req));
  return res.json(result);
});

// ─────────────────────────────────────────────────────────────────
// Module 3 : Cycle de vie — demande de suppression
// ─────────────────────────────────────────────────────────────────

/**
 * POST /api/privacy/delete-account
 * Déclenche la demande de suppression du compte (délai de grâce : 90 jours).
 * La purge effective sera exécutée par le cron job.
 */
router.post('/delete-account', async (req, res) => {
  await requestAccountDeletion(orgId(req), actorId(req));
  return res.json({
    message:
      'Demande de suppression enregistrée. Vos données seront définitivement supprimées ' +
      'dans 90 jours conformément à la Loi 25 du Québec. ' +
      "Vous pouvez annuler cette demande avant l'échéance.",
    purgeEligibleAt: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 90);
      return d.toISOString();
    })(),
  });
});

/**
 * DELETE /api/privacy/delete-account
 * Annule la demande de suppression (pendant la période de grâce).
 */
router.delete('/delete-account', async (req, res) => {
  await cancelAccountDeletion(orgId(req), actorId(req));
  return res.json({ message: 'Demande de suppression annulée.' });
});

// ─────────────────────────────────────────────────────────────────
// Incidents de confidentialité (art. 3.5 Loi 25)
// ─────────────────────────────────────────────────────────────────

const incidentSchema = z.object({
  description: z.string().min(10).max(5000),
  dataCategories: z.array(z.string()).min(1),
  affectedCount: z.number().int().nonnegative().optional(),
  mitigations: z.string().max(5000).optional(),
});

/**
 * POST /api/privacy/incidents
 * Déclare un incident de confidentialité.
 */
router.post('/incidents', async (req, res) => {
  const parsed = incidentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides.', issues: parsed.error.issues });
  }

  const incident = await db.privacyIncident.create({
    data: {
      organizationId: orgId(req),
      reportedById: actorId(req),
      description: parsed.data.description,
      dataCategories: parsed.data.dataCategories,
      affectedCount: parsed.data.affectedCount ?? null,
      mitigations: parsed.data.mitigations ?? null,
    },
  });

  await logEvent({
    organizationId: orgId(req),
    actorId: actorId(req),
    actorEmail: actorEmail(req),
    event: 'PRIVACY_INCIDENT',
    targetResource: `incident:${incident.id}`,
    details: {
      dataCategories: parsed.data.dataCategories,
      affectedCount: parsed.data.affectedCount,
    },
    ipAddress: ip(req),
  });

  return res.status(201).json(incident);
});

/**
 * GET /api/privacy/incidents
 * Liste les incidents de l'organisation.
 */
router.get('/incidents', async (req, res) => {
  const incidents = await db.privacyIncident.findMany({
    where: { organizationId: orgId(req) },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(incidents);
});

export default router;
