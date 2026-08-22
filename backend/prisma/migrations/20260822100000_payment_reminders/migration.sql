-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "clientId" TEXT,
    "channel" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promisedPaymentDate" TIMESTAMP(3),
    "nextReminderDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentReminder_organizationId_idx" ON "PaymentReminder"("organizationId");
CREATE INDEX "PaymentReminder_invoiceId_contactedAt_idx" ON "PaymentReminder"("invoiceId", "contactedAt");

ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentReminder" ADD CONSTRAINT "PaymentReminder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
