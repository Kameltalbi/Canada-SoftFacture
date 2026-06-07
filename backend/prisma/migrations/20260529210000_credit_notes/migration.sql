-- AlterEnum
ALTER TYPE "InvoiceKind" ADD VALUE 'CREDIT_NOTE';

-- AlterTable Organization
ALTER TABLE "Organization" ADD COLUMN "creditNotePrefix" TEXT NOT NULL DEFAULT 'AVR';
ALTER TABLE "Organization" ADD COLUMN "creditNoteSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "lastCreditNoteYear" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "creditNoteNumberFormat" TEXT NOT NULL DEFAULT '{PREFIX}-{YYYY}-{SEQ:4}';
ALTER TABLE "Organization" ADD COLUMN "creditNoteResetYearly" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable Invoice
ALTER TABLE "Invoice" ADD COLUMN "creditedInvoiceId" TEXT;

CREATE UNIQUE INDEX "Invoice_creditedInvoiceId_key" ON "Invoice"("creditedInvoiceId");

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_creditedInvoiceId_fkey" FOREIGN KEY ("creditedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
