-- Téléphone administrateur
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- Fin de configuration initiale (plan + infos société)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);

-- Rôle ADMIN (alignement code / enum PostgreSQL)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'OWNER'
  ) THEN
    UPDATE "User" SET role = 'ADMIN' WHERE role::text = 'OWNER';
    UPDATE "UserInvitation" SET role = 'ADMIN' WHERE role::text = 'OWNER';
  END IF;
END $$;

-- Comptes déjà actifs : ne pas bloquer (trial ou abonnement en cours)
UPDATE "Organization"
SET "onboardingCompletedAt" = NOW()
WHERE "onboardingCompletedAt" IS NULL
  AND ("billingStatus" IN ('TRIAL', 'ACTIVE') OR "trialEndsAt" IS NOT NULL);
