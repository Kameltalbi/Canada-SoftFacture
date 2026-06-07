/**
 * Module de fin de cycle de vie — Loi 25 art. 28 / PIPEDA principe 5.
 *
 * Logique de purge (déclenchée par cron quotidien) :
 *   A) Trouve les OrganizationDeletionRequest dont purgeEligibleAt <= maintenant.
 *   B) Pour chaque compte éligible :
 *      1. Hard-delete : Users, PasswordResets, UserInvitations, sessions.
 *      2. Anonymisation irréversible : Client.email/phone/name → hash non réversible.
 *         Les factures conservent montants + taxes + dates (obligations fiscales, art. 34 LFI).
 *      3. Hard-delete : Organization (cascade sur produits, quotes, etc.).
 *      4. Enregistre le rapport de purge dans DataAccessLog.
 *
 * Obligations fiscales canadiennes :
 *   - Conservation des données financières : 7 ans (art. 230 Loi de l'impôt sur le revenu).
 *   - La Loi 25 exige la destruction des RP non nécessaires, mais pas des données comptables.
 *   → Solution : anonymiser les RP des clients finaux sur les factures,
 *     conserver les montants, taxes, dates.
 */

import { prisma } from '../db.js';
import { anonymizeField } from './fieldEncryption.js';
import { logEvent } from './auditLogger.js';

// Cast temporaire — types disponibles après `prisma migrate dev`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

interface PurgeReport {
  organizationId: string;
  organizationName: string;
  usersDeleted: number;
  clientsAnonymized: number;
  invoicesAnonymized: number;
  purgedAt: string;
}

/**
 * Exécute la purge complète d'une organisation.
 * Retourne un rapport de purge.
 */
async function purgeOrganization(organizationId: string): Promise<PurgeReport> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { users: true, clients: true },
  });

  if (!org) throw new Error(`Organisation ${organizationId} introuvable.`);

  const report: PurgeReport = {
    organizationId,
    organizationName: org.name,
    usersDeleted: 0,
    clientsAnonymized: 0,
    invoicesAnonymized: 0,
    purgedAt: new Date().toISOString(),
  };

  await prisma.$transaction(async (tx) => {
    // ── Étape 1 : Hard-delete des accès et utilisateurs ──────────────────
    // PasswordResets en cascade via User
    const deletedUsers = await tx.user.deleteMany({ where: { organizationId } });
    report.usersDeleted = deletedUsers.count;

    // ── Étape 2 : Anonymisation des clients (données personnelles) ────────
    // On remplace email, phone, name par des valeurs irréversibles.
    // L'ID client est conservé pour l'intégrité référentielle des factures.
    for (const client of org.clients) {
      await tx.client.update({
        where: { id: client.id },
        data: {
          name: 'Client Anonymisé',
          email: anonymizeField(client.email),
          phone: anonymizeField(client.phone),
          address: null,
          postalCode: null,
          city: 'Ville Anonymisée',
          taxId: anonymizeField(client.taxId),
          siren: null,
        },
      });
      report.clientsAnonymized++;
    }

    // ── Étape 3 : Anonymisation des factures (notes libres) ───────────────
    // Conserver : number, issueDate, dueDate, subtotalHt, vatTotal, totalTtc, currency, status.
    // Effacer : notes (peut contenir des RP), deliveryAddress.
    const updatedInvoices = await tx.invoice.updateMany({
      where: { organizationId },
      data: {
        notes: '[Contenu anonymisé — Loi 25]',
        deliveryAddress: null,
        deliveryCity: null,
        deliveryPostalCode: null,
        deliveryCountry: null,
      },
    });
    report.invoicesAnonymized = updatedInvoices.count;

    // ── Étape 4 : Marquer la demande comme "PURGING" dans la même transaction
    await db.organizationDeletionRequest.update({
      where: { organizationId },
      data: { status: 'PURGING' },
    });
  });

  // ── Étape 5 : Suppression de l'organisation (cascade BD) ─────────────
  // Hors transaction car certains SGBD ne supportent pas les cascades en tx.
  await prisma.organization.delete({ where: { id: organizationId } });

  return report;
}

/**
 * Worker principal — à appeler quotidiennement via cron ou scheduler.
 * Traite tous les comptes dont le délai de grâce de 90 jours est écoulé.
 */
export async function runLifecyclePurgeJob(): Promise<void> {
  const now = new Date();

  // Trouver les demandes éligibles à la purge
  const eligibleRequests = await db.organizationDeletionRequest.findMany({
    where: {
      status: { in: ['PENDING', 'GRACE_PERIOD'] },
      purgeEligibleAt: { lte: now },
    },
  });

  if (eligibleRequests.length === 0) {
    console.log('[lifecyclePurge] Aucune organisation à purger.');
    return;
  }

  console.log(`[lifecyclePurge] ${eligibleRequests.length} organisation(s) à purger.`);

  for (const request of eligibleRequests) {
    const { organizationId } = request;
    console.log(`[lifecyclePurge] Purge de l'organisation ${organizationId}...`);

    try {
      const report = await purgeOrganization(organizationId);

      // Mettre à jour le statut de la demande
      await db.organizationDeletionRequest.update({
        where: { organizationId },
        data: {
          status: 'COMPLETED',
          purgedAt: new Date(),
          purgeReport: report as unknown as Record<string, unknown>,
        },
      });

      // Tracer dans le registre d'audit (immuable)
      await logEvent({
        event: 'ACCOUNT_PURGE',
        targetResource: `organization:${organizationId}`,
        details: {
          usersDeleted: report.usersDeleted,
          clientsAnonymized: report.clientsAnonymized,
          invoicesAnonymized: report.invoicesAnonymized,
        },
      });

      console.log(`[lifecyclePurge] ✅ Organisation ${organizationId} purgée.`);
    } catch (err) {
      console.error(`[lifecyclePurge] ❌ Erreur pour ${organizationId}:`, err);

      await logEvent({
        event: 'ACCOUNT_PURGE',
        targetResource: `organization:${organizationId}`,
        details: { error: String(err), success: false },
      });
    }
  }
}

/**
 * Enregistre une demande de suppression de compte (art. 28 Loi 25).
 * La purge effective aura lieu 90 jours plus tard.
 *
 * @param organizationId - Organisation à résilier.
 * @param requestedById  - Administrateur ayant déclenché la demande.
 * @param graceDays      - Délai de grâce avant purge (défaut : 90 jours).
 */
export async function requestAccountDeletion(
  organizationId: string,
  requestedById: string,
  graceDays = 90
): Promise<void> {
  const purgeEligibleAt = new Date();
  purgeEligibleAt.setDate(purgeEligibleAt.getDate() + graceDays);

  await db.organizationDeletionRequest.upsert({
    where: { organizationId },
    update: { status: 'PENDING', purgeEligibleAt, requestedById },
    create: { organizationId, purgeEligibleAt, requestedById, status: 'PENDING' },
  });

  await logEvent({
    organizationId,
    actorId: requestedById,
    event: 'DATA_DELETE',
    targetResource: `organization:${organizationId}`,
    details: {
      action: 'account_deletion_requested',
      purgeEligibleAt: purgeEligibleAt.toISOString(),
      graceDays,
    },
  });
}

/**
 * Annule une demande de suppression (pendant la période de grâce).
 */
export async function cancelAccountDeletion(
  organizationId: string,
  cancelledById: string
): Promise<void> {
  await db.organizationDeletionRequest.update({
    where: { organizationId },
    data: { status: 'CANCELLED' },
  });

  await logEvent({
    organizationId,
    actorId: cancelledById,
    event: 'DATA_DELETE',
    targetResource: `organization:${organizationId}`,
    details: { action: 'account_deletion_cancelled' },
  });
}
