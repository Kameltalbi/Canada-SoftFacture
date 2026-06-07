-- Phase A e-facture : mentions légales, cycle de vie PA, connecteur OD

CREATE TYPE "InvoiceOperationNature" AS ENUM ('GOODS', 'SERVICES', 'MIXED');
CREATE TYPE "PaProvider" AS ENUM ('NONE', 'MOCK');
CREATE TYPE "EInvoiceTransmissionStatus" AS ENUM ('PENDING', 'DEPOSITED', 'REJECTED', 'REFUSED', 'COLLECTED');

ALTER TABLE "Organization" ADD COLUMN "vatOnDebitsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "paProvider" "PaProvider" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Organization" ADD COLUMN "paAccountRef" TEXT;
ALTER TABLE "Organization" ADD COLUMN "paConnectedAt" TIMESTAMP(3);

ALTER TABLE "Client" ADD COLUMN "siren" TEXT;
ALTER TABLE "Client" ADD COLUMN "postalCode" TEXT;

ALTER TABLE "Invoice" ADD COLUMN "operationNature" "InvoiceOperationNature" NOT NULL DEFAULT 'SERVICES';
ALTER TABLE "Invoice" ADD COLUMN "vatOnDebits" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN "useDifferentDeliveryAddress" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Invoice" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "deliveryPostalCode" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "deliveryCity" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "deliveryCountry" TEXT;

CREATE TABLE "EInvoiceTransmission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "paProvider" "PaProvider" NOT NULL,
    "status" "EInvoiceTransmissionStatus" NOT NULL DEFAULT 'PENDING',
    "paExternalId" TEXT,
    "lastError" TEXT,
    "depositedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EInvoiceTransmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EInvoiceTransmission_organizationId_idx" ON "EInvoiceTransmission"("organizationId");
CREATE INDEX "EInvoiceTransmission_invoiceId_idx" ON "EInvoiceTransmission"("invoiceId");
CREATE INDEX "EInvoiceTransmission_organizationId_status_idx" ON "EInvoiceTransmission"("organizationId", "status");

ALTER TABLE "EInvoiceTransmission" ADD CONSTRAINT "EInvoiceTransmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EInvoiceTransmission" ADD CONSTRAINT "EInvoiceTransmission_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Dériver le SIREN depuis le SIRET existant (taxId) quand possible
UPDATE "Client"
SET "siren" = LEFT(REGEXP_REPLACE(COALESCE("taxId", ''), '[^0-9]', '', 'g'), 9)
WHERE "siren" IS NULL
  AND LENGTH(REGEXP_REPLACE(COALESCE("taxId", ''), '[^0-9]', '', 'g')) >= 9;
