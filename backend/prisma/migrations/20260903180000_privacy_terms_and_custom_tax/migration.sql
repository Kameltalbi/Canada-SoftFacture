-- Align DB with schema drift: terms consent, Loi 25 privacy tables, CustomTax

-- User CGU / privacy consent
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;

-- Custom taxes per organization
CREATE TABLE IF NOT EXISTS "CustomTax" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomTax_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CustomTax_organizationId_idx" ON "CustomTax"("organizationId");

DO $$ BEGIN
  ALTER TABLE "CustomTax"
    ADD CONSTRAINT "CustomTax_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Data access audit log (Loi 25)
DO $$ BEGIN
  CREATE TYPE "DataAccessEventType" AS ENUM (
    'DATA_EXPORT',
    'DATA_VIEW_SENSITIVE',
    'DATA_UPDATE',
    'DATA_DELETE',
    'ACCOUNT_PURGE',
    'ACCOUNT_ANONYMIZE',
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'PERMISSION_CHANGE',
    'PRIVACY_INCIDENT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DataAccessLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "event" "DataAccessEventType" NOT NULL,
    "targetResource" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "previousHash" TEXT,
    "rowHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataAccessLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DataAccessLog_organizationId_idx" ON "DataAccessLog"("organizationId");
CREATE INDEX IF NOT EXISTS "DataAccessLog_actorId_idx" ON "DataAccessLog"("actorId");
CREATE INDEX IF NOT EXISTS "DataAccessLog_event_idx" ON "DataAccessLog"("event");
CREATE INDEX IF NOT EXISTS "DataAccessLog_createdAt_idx" ON "DataAccessLog"("createdAt");

-- Account deletion / purge requests
DO $$ BEGIN
  CREATE TYPE "DeletionRequestStatus" AS ENUM (
    'PENDING',
    'GRACE_PERIOD',
    'PURGING',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrganizationDeletionRequest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purgeEligibleAt" TIMESTAMP(3) NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "purgedAt" TIMESTAMP(3),
    "purgeReport" JSONB,
    "requestedById" TEXT,

    CONSTRAINT "OrganizationDeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationDeletionRequest_organizationId_key" ON "OrganizationDeletionRequest"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationDeletionRequest_status_idx" ON "OrganizationDeletionRequest"("status");
CREATE INDEX IF NOT EXISTS "OrganizationDeletionRequest_purgeEligibleAt_idx" ON "OrganizationDeletionRequest"("purgeEligibleAt");

-- Privacy incidents
CREATE TABLE IF NOT EXISTS "PrivacyIncident" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "description" TEXT NOT NULL,
    "dataCategories" TEXT[],
    "affectedCount" INTEGER,
    "reportedToCai" BOOLEAN NOT NULL DEFAULT false,
    "reportedToCaiAt" TIMESTAMP(3),
    "mitigations" TEXT,
    "reportedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyIncident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PrivacyIncident_organizationId_idx" ON "PrivacyIncident"("organizationId");
CREATE INDEX IF NOT EXISTS "PrivacyIncident_createdAt_idx" ON "PrivacyIncident"("createdAt");
