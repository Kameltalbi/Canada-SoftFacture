-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "stockManagementEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Activer pour les organisations qui ont déjà des produits stockables
UPDATE "Organization" o
SET "stockManagementEnabled" = true
WHERE EXISTS (
  SELECT 1 FROM "Product" p
  WHERE p."organizationId" = o.id
    AND p.kind = 'PRODUCT'
    AND p."isActive" = true
);
