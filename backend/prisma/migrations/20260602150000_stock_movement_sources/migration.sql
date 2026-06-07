-- CreateEnum
CREATE TYPE "StockMovementSource" AS ENUM ('INITIAL', 'INVOICE', 'CREDIT_NOTE', 'INVENTORY', 'CANCEL_REVERSAL');

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "source" "StockMovementSource" NOT NULL DEFAULT 'INITIAL';
ALTER TABLE "StockMovement" ADD COLUMN "invoiceId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "invoiceLineId" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_invoiceId_idx" ON "StockMovement"("invoiceId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
