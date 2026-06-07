-- Migration : Conformité Loi Anti-Fraude TVA Art. 88
-- 1. Champ isMicroEntrepreneur sur Organization (franchise TVA art. 293 B CGI)
-- 2. Champ isCompany sur Client (mentions B2B L441-10)
-- 3. Table InvoiceAuditLog (chaîne cryptographique SHA-256)

-- 1. Organization.isMicroEntrepreneur
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "isMicroEntrepreneur" BOOLEAN NOT NULL DEFAULT false;

-- 2. Client.isCompany
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "isCompany" BOOLEAN NOT NULL DEFAULT false;

-- 3. Table InvoiceAuditLog
CREATE TABLE IF NOT EXISTS "InvoiceAuditLog" (
    "id"             TEXT NOT NULL,
    "invoiceId"      TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceNumber"  TEXT NOT NULL,
    "hash"           TEXT NOT NULL,
    "previousHash"   TEXT,
    "validatedAt"    TIMESTAMP(3) NOT NULL,
    "totalTtc"       TEXT NOT NULL,
    "clientId"       TEXT NOT NULL,

    CONSTRAINT "InvoiceAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceAuditLog_invoiceId_key" ON "InvoiceAuditLog"("invoiceId");
CREATE INDEX IF NOT EXISTS "InvoiceAuditLog_organizationId_idx" ON "InvoiceAuditLog"("organizationId");
CREATE INDEX IF NOT EXISTS "InvoiceAuditLog_organizationId_validatedAt_idx" ON "InvoiceAuditLog"("organizationId", "validatedAt");

ALTER TABLE "InvoiceAuditLog"
    ADD CONSTRAINT "InvoiceAuditLog_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InvoiceAuditLog"
    ADD CONSTRAINT "InvoiceAuditLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
