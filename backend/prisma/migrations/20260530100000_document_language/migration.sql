-- CreateEnum
CREATE TYPE "DocumentLanguage" AS ENUM ('FR', 'EN', 'DE', 'ES', 'IT');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "documentLanguage" "DocumentLanguage" NOT NULL DEFAULT 'FR';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN "documentLanguage" "DocumentLanguage" NOT NULL DEFAULT 'FR';

-- AlterTable
ALTER TABLE "RecurringInvoice" ADD COLUMN "documentLanguage" "DocumentLanguage" NOT NULL DEFAULT 'FR';
