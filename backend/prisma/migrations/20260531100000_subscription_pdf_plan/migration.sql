-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'BUSINESS');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER';
ALTER TABLE "Organization" ADD COLUMN "pdfPrimaryColor" TEXT NOT NULL DEFAULT '#0f766e';
ALTER TABLE "Organization" ADD COLUMN "invoicePdfAccentColor" TEXT;
ALTER TABLE "Organization" ADD COLUMN "quotePdfAccentColor" TEXT;
ALTER TABLE "Organization" ADD COLUMN "otherDocumentPdfAccentColor" TEXT;
