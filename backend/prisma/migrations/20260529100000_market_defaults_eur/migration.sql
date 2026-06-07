-- Pivot marché : defaults EUR/FR et migration des données existantes (ex-TN/TND)

UPDATE "Organization" SET "country" = 'FR' WHERE "country" = 'TN';
UPDATE "Organization" SET "defaultCurrency" = 'EUR' WHERE "defaultCurrency" = 'TND';
UPDATE "Organization" SET "defaultVatRate" = 20 WHERE "defaultVatRate" = 19;

UPDATE "Client" SET "country" = 'FR' WHERE "country" = 'TN';
UPDATE "Invoice" SET "currency" = 'EUR' WHERE "currency" = 'TND';
UPDATE "Quote" SET "currency" = 'EUR' WHERE "currency" = 'TND';

ALTER TABLE "Organization" ALTER COLUMN "country" SET DEFAULT 'FR';
ALTER TABLE "Organization" ALTER COLUMN "defaultCurrency" SET DEFAULT 'EUR';
ALTER TABLE "Organization" ALTER COLUMN "defaultVatRate" SET DEFAULT 20;

ALTER TABLE "Client" ALTER COLUMN "country" SET DEFAULT 'FR';
ALTER TABLE "Product" ALTER COLUMN "vatRate" SET DEFAULT 20;
ALTER TABLE "Invoice" ALTER COLUMN "currency" SET DEFAULT 'EUR';
ALTER TABLE "Quote" ALTER COLUMN "currency" SET DEFAULT 'EUR';
