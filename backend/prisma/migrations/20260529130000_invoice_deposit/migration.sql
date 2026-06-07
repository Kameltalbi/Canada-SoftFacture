-- Factures d'acompte et déduction sur facture finale
CREATE TYPE "InvoiceKind" AS ENUM ('STANDARD', 'DEPOSIT');

ALTER TABLE "Organization" ADD COLUMN "depositPrefix" TEXT NOT NULL DEFAULT 'ACO';
ALTER TABLE "Organization" ADD COLUMN "depositSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "lastDepositYear" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "depositNumberFormat" TEXT NOT NULL DEFAULT '{PREFIX}-{YYYY}-{SEQ:4}';
ALTER TABLE "Organization" ADD COLUMN "depositResetYearly" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Invoice" ADD COLUMN "kind" "InvoiceKind" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Invoice" ADD COLUMN "advanceDeduction" DECIMAL(14,3) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "netToPay" DECIMAL(14,3);
ALTER TABLE "Invoice" ADD COLUMN "appliedDepositId" TEXT;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_appliedDepositId_fkey"
  FOREIGN KEY ("appliedDepositId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Invoice_organizationId_kind_idx" ON "Invoice"("organizationId", "kind");
CREATE INDEX "Invoice_appliedDepositId_idx" ON "Invoice"("appliedDepositId");

-- Renseigner netToPay pour les factures existantes
UPDATE "Invoice" SET "netToPay" = "totalTtc" WHERE "netToPay" IS NULL;
