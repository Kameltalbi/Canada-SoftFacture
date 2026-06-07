-- Préfixe / compteurs devis
ALTER TABLE "Organization" ADD COLUMN "quotePrefix" TEXT NOT NULL DEFAULT 'DEV';
ALTER TABLE "Organization" ADD COLUMN "quoteSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "lastQuoteYear" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED');

CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "number" TEXT,
    "quoteYear" INTEGER,
    "sequenceNumber" INTEGER,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'TND',
    "notes" TEXT,
    "subtotalHt" DECIMAL(14,3) NOT NULL,
    "vatTotal" DECIMAL(14,3) NOT NULL,
    "totalTtc" DECIMAL(14,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quote_organizationId_number_key" ON "Quote"("organizationId", "number");

CREATE TABLE "QuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPriceHt" DECIMAL(12,3) NOT NULL,
    "taxRate" DECIMAL(5,2) NOT NULL,
    "lineTotalHt" DECIMAL(14,3) NOT NULL,
    "lineVat" DECIMAL(14,3) NOT NULL,
    "lineTotalTtc" DECIMAL(14,3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Quote_organizationId_idx" ON "Quote"("organizationId");
CREATE INDEX "Quote_organizationId_status_idx" ON "Quote"("organizationId", "status");
CREATE INDEX "QuoteLine_quoteId_idx" ON "QuoteLine"("quoteId");

ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD COLUMN "quoteId" TEXT;
CREATE UNIQUE INDEX "Invoice_quoteId_key" ON "Invoice"("quoteId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
