-- CreateEnum
CREATE TYPE "PdfDocumentTemplate" AS ENUM ('CLASSIC', 'MODERN', 'MINIMAL');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "invoicePdfTemplate" "PdfDocumentTemplate" NOT NULL DEFAULT 'CLASSIC';
ALTER TABLE "Organization" ADD COLUMN "quotePdfTemplate" "PdfDocumentTemplate" NOT NULL DEFAULT 'CLASSIC';
ALTER TABLE "Organization" ADD COLUMN "otherDocumentPdfTemplate" "PdfDocumentTemplate" NOT NULL DEFAULT 'CLASSIC';
ALTER TABLE "Organization" ADD COLUMN "documentFooterText" TEXT;
