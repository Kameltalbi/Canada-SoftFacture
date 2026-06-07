/**
 * Registre d'audit immuable — Loi 25 art. 63.1 / PIPEDA principe 1.
 *
 * Architecture :
 *   - Chaque entrée dans DataAccessLog est chaînée par hash (comme une blockchain
 *     simplifiée) : rowHash = SHA-256(previousHash + event + actorId + targetResource + createdAt).
 *   - Aucune route UPDATE/DELETE n'est exposée sur DataAccessLog.
 *   - La fonction logEvent() est la SEULE entrée d'écriture autorisée.
 *   - verifyChainIntegrity() permet de valider l'intégrité lors d'un audit CAI.
 *
 * Obligation légale :
 *   Art. 63.1 Loi 25 — L'entreprise doit tenir un registre des incidents
 *   d'atteinte à la confidentialité et des accès aux renseignements personnels.
 */

import { createHash } from 'node:crypto';
import { prisma } from '../db.js';
import type { Prisma } from '../../generated/prisma/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any; // Cast temporaire : les types seront générés après `prisma migrate dev`

/**
 * Copie locale de l'enum — sera remplacée par l'import généré après `prisma migrate dev`.
 * Doit rester synchronisée avec schema.prisma DataAccessEventType.
 */
export type DataAccessEventType =
  | 'DATA_EXPORT'
  | 'DATA_VIEW_SENSITIVE'
  | 'DATA_UPDATE'
  | 'DATA_DELETE'
  | 'ACCOUNT_PURGE'
  | 'ACCOUNT_ANONYMIZE'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'PERMISSION_CHANGE'
  | 'PRIVACY_INCIDENT';

export interface LogEventInput {
  organizationId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  event: DataAccessEventType;
  targetResource?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Calcule le hash d'une ligne de log (SHA-256).
 * La chaîne inclut le hash de la ligne précédente pour l'immuabilité.
 */
function computeRowHash(entry: {
  previousHash: string | null;
  event: string;
  actorId?: string | null;
  organizationId?: string | null;
  targetResource?: string | null;
  createdAt: Date;
}): string {
  const payload = JSON.stringify({
    previousHash: entry.previousHash ?? '',
    event: entry.event,
    actorId: entry.actorId ?? '',
    organizationId: entry.organizationId ?? '',
    targetResource: entry.targetResource ?? '',
    createdAt: entry.createdAt.toISOString(),
  });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Enregistre un événement d'accès ou de modification de données.
 * Cette fonction est NON-BLOQUANTE sur les erreurs de log pour ne pas
 * interrompre le flux métier, mais logue toujours l'erreur en console.
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  try {
    // Récupérer le hash de la dernière entrée pour créer la chaîne
    const lastLog = await db.dataAccessLog.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { rowHash: true },
    });

    const createdAt = new Date();
    const previousHash = lastLog?.rowHash ?? null;

    const rowHash = computeRowHash({
      previousHash,
      event: input.event,
      actorId: input.actorId,
      organizationId: input.organizationId,
      targetResource: input.targetResource,
      createdAt,
    });

    await db.dataAccessLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        event: input.event,
        targetResource: input.targetResource ?? null,
        details: (input.details as Prisma.InputJsonValue) ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        previousHash,
        rowHash,
        createdAt,
      },
    });
  } catch (err) {
    // Non-fatal : on log l'erreur sans interrompre le flux principal
    console.error("[auditLogger] Erreur d'enregistrement du log :", err);
  }
}

/**
 * Vérifie l'intégrité de la chaîne de logs pour une organisation.
 * Retourne les lignes dont le hash ne correspond pas (preuve de falsification).
 * Utilisé lors d'un audit CAI ou d'un incident de sécurité.
 */
export async function verifyChainIntegrity(organizationId?: string): Promise<{
  valid: boolean;
  totalChecked: number;
  tamperedEntries: { id: string; event: string; createdAt: Date }[];
}> {
  const logs = await db.dataAccessLog.findMany({
    where: organizationId ? { organizationId } : {},
    orderBy: { createdAt: 'asc' },
  });

  const tamperedEntries: { id: string; event: string; createdAt: Date }[] = [];

  for (const log of logs) {
    const expectedHash = computeRowHash({
      previousHash: log.previousHash,
      event: log.event,
      actorId: log.actorId,
      organizationId: log.organizationId,
      targetResource: log.targetResource,
      createdAt: log.createdAt,
    });

    if (expectedHash !== log.rowHash) {
      tamperedEntries.push({ id: log.id, event: log.event, createdAt: log.createdAt });
    }
  }

  return {
    valid: tamperedEntries.length === 0,
    totalChecked: logs.length,
    tamperedEntries,
  };
}
