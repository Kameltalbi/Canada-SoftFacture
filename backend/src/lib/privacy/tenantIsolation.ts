/**
 * Isolation multi-tenant — Loi 25 art. 10, PIPEDA principe 7.
 *
 * Architecture choisie : Middleware Applicatif + RLS PostgreSQL (double barrière).
 *
 * Barrière 1 (application) :
 *   Toutes les requêtes Prisma doivent inclure { organizationId } dans le WHERE.
 *   Ce module expose un helper `assertTenantAccess` qui lève une erreur si
 *   l'enregistrement récupéré appartient à une autre organisation.
 *
 * Barrière 2 (base de données) :
 *   Le script SQL ci-dessous active RLS sur les tables critiques.
 *   PostgreSQL refuse lui-même les lectures/écritures cross-tenant.
 *
 * ─── Script SQL RLS à exécuter en migration manuelle ───────────────────────
 *
 *   -- Activer RLS sur les tables contenant des données personnelles
 *   ALTER TABLE "Client"  ENABLE ROW LEVEL SECURITY;
 *   ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
 *   ALTER TABLE "User"    ENABLE ROW LEVEL SECURITY;
 *
 *   -- Rôle applicatif (utiliser dans DATABASE_URL)
 *   CREATE ROLE softfacture_app LOGIN PASSWORD 'changeme';
 *
 *   -- Politique : l'app ne voit que les lignes de son org (passée via setting)
 *   CREATE POLICY tenant_isolation ON "Client"
 *     USING ("organizationId" = current_setting('app.current_org_id', TRUE));
 *
 *   CREATE POLICY tenant_isolation ON "Invoice"
 *     USING ("organizationId" = current_setting('app.current_org_id', TRUE));
 *
 *   GRANT SELECT, INSERT, UPDATE, DELETE ON "Client","Invoice","User" TO softfacture_app;
 *
 *   -- Dans le code, avant chaque requête sensible :
 *   await prisma.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, TRUE)`;
 * ───────────────────────────────────────────────────────────────────────────
 */

import { prisma } from '../db.js';

/**
 * Vérifie qu'un enregistrement appartient bien à l'organisation de la requête.
 * @throws 403 si violation d'isolation détectée.
 */
export function assertTenantAccess(
  record: { organizationId: string } | null | undefined,
  requestingOrgId: string,
  resourceName = 'resource'
): asserts record is { organizationId: string } {
  if (!record) {
    const err = new Error(`${resourceName} introuvable.`);
    (err as NodeJS.ErrnoException).code = 'NOT_FOUND';
    throw err;
  }
  if (record.organizationId !== requestingOrgId) {
    // ALERTE SÉCURITÉ : tentative d'accès cross-tenant
    const err = new Error(
      `[tenantIsolation] Accès refusé : tentative d'accès cross-tenant détectée. ` +
        `Org demandante: ${requestingOrgId}, propriétaire: ${record.organizationId}`
    );
    (err as NodeJS.ErrnoException).code = 'TENANT_VIOLATION';
    throw err;
  }
}

/**
 * Positionne le setting PostgreSQL de l'organisation courante pour RLS.
 * À appeler au début de chaque transaction sensible (clients, factures).
 */
export async function setRlsContext(orgId: string): Promise<void> {
  await prisma.$executeRaw`SELECT set_config('app.current_org_id', ${orgId}, TRUE)`;
}

/**
 * Wrapper de requête avec contexte RLS automatique.
 * Garantit que toutes les opérations dans la fonction sont scopées au tenant.
 */
export async function withTenantContext<T>(orgId: string, fn: () => Promise<T>): Promise<T> {
  await setRlsContext(orgId);
  try {
    return await fn();
  } finally {
    // Réinitialiser pour éviter la fuite de contexte entre requêtes poolées
    await prisma.$executeRaw`SELECT set_config('app.current_org_id', '', TRUE)`;
  }
}
