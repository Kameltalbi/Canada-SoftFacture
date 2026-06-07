-- Nouveaux statuts facture (ajout en fin d’enum PostgreSQL)
ALTER TYPE "InvoiceStatus" ADD VALUE 'VALIDATED';
ALTER TYPE "InvoiceStatus" ADD VALUE 'PARTIALLY_PAID';

-- Compteurs / préfixe numérotation (validation)
ALTER TABLE "Organization" ADD COLUMN "invoicePrefix" TEXT NOT NULL DEFAULT 'FAC';
ALTER TABLE "Organization" ADD COLUMN "invoiceSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "lastInvoiceYear" INTEGER NOT NULL DEFAULT 0;

-- Facture : numéro attribué à la validation ; année + séquence
ALTER TABLE "Invoice" ADD COLUMN "invoiceYear" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "sequenceNumber" INTEGER;

ALTER TABLE "Invoice" ALTER COLUMN "number" DROP NOT NULL;
