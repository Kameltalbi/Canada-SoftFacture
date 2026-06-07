-- Réception factures fournisseurs Factur-X (destinataire / tenant)

CREATE TYPE "ReceivedInvoiceSource" AS ENUM ('UPLOAD', 'PA_WEBHOOK', 'PA_SYNC');
CREATE TYPE "ReceivedInvoiceStatus" AS ENUM ('RECEIVED', 'ACCEPTED', 'DISPUTED', 'REFUSED', 'COLLECTED');

CREATE TABLE "ReceivedInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "source" "ReceivedInvoiceSource" NOT NULL DEFAULT 'UPLOAD',
    "paProvider" "PaProvider" NOT NULL DEFAULT 'NONE',
    "paExternalId" TEXT,
    "status" "ReceivedInvoiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "supplierName" TEXT NOT NULL,
    "supplierSiren" TEXT,
    "supplierSiret" TEXT,
    "supplierVat" TEXT,
    "buyerSiren" TEXT,
    "buyerName" TEXT,
    "subtotalHt" DECIMAL(14,3) NOT NULL,
    "vatTotal" DECIMAL(14,3) NOT NULL,
    "totalTtc" DECIMAL(14,3) NOT NULL,
    "facturXProfile" TEXT,
    "pdfFilename" TEXT NOT NULL,
    "xmlContent" TEXT NOT NULL,
    "buyerMismatch" BOOLEAN NOT NULL DEFAULT false,
    "statusNote" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivedInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReceivedInvoice_organizationId_supplierSiren_invoiceNumber_key" ON "ReceivedInvoice"("organizationId", "supplierSiren", "invoiceNumber");
CREATE INDEX "ReceivedInvoice_organizationId_idx" ON "ReceivedInvoice"("organizationId");
CREATE INDEX "ReceivedInvoice_organizationId_status_idx" ON "ReceivedInvoice"("organizationId", "status");
CREATE INDEX "ReceivedInvoice_organizationId_receivedAt_idx" ON "ReceivedInvoice"("organizationId", "receivedAt");

ALTER TABLE "ReceivedInvoice" ADD CONSTRAINT "ReceivedInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
