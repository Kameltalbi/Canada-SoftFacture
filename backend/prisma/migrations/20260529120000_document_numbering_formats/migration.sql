-- Formats de numérotation configurables (factures & devis)
ALTER TABLE "Organization" ADD COLUMN "invoiceNumberFormat" TEXT NOT NULL DEFAULT '{PREFIX}-{YYYY}-{SEQ:4}';
ALTER TABLE "Organization" ADD COLUMN "quoteNumberFormat" TEXT NOT NULL DEFAULT '{PREFIX}-{YYYY}-{SEQ:4}';
ALTER TABLE "Organization" ADD COLUMN "invoiceResetYearly" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "quoteResetYearly" BOOLEAN NOT NULL DEFAULT true;
