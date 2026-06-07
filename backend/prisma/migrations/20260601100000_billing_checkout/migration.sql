-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('NONE', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('NONE', 'STRIPE');

-- CreateEnum
CREATE TYPE "BillingCheckoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "billingStatus" "BillingStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Organization" ADD COLUMN "billingProvider" "BillingProvider" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Organization" ADD COLUMN "billingEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingLegalName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingSiret" TEXT;
ALTER TABLE "Organization" ADD COLUMN "billingVatNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "pendingSubscriptionPlan" "SubscriptionPlan";

-- CreateTable
CREATE TABLE "BillingCheckoutSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "BillingCheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "BillingProvider" NOT NULL DEFAULT 'NONE',
    "providerSessionId" TEXT,
    "amountTtcCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "successUrl" TEXT NOT NULL,
    "cancelUrl" TEXT NOT NULL,
    "customerEmail" TEXT,
    "billingLegalName" TEXT,
    "billingSiret" TEXT,
    "billingVatNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "BillingCheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingCheckoutSession_organizationId_idx" ON "BillingCheckoutSession"("organizationId");

-- CreateIndex
CREATE INDEX "BillingCheckoutSession_providerSessionId_idx" ON "BillingCheckoutSession"("providerSessionId");

-- AddForeignKey
ALTER TABLE "BillingCheckoutSession" ADD CONSTRAINT "BillingCheckoutSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
