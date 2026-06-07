-- Migration : Champs structurés pour mentions légales du vendeur
-- Permet la génération automatique du pied de page de facture

ALTER TABLE "Organization" 
  ADD COLUMN IF NOT EXISTS "legalForm" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "shareCapital" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "rcsCity" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "legalAddress" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "legalPostalCode" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "legalCity" VARCHAR(100);
