ALTER TABLE "Organization" ADD COLUMN "pdfFontFamily" TEXT NOT NULL DEFAULT 'Open Sans';
ALTER TABLE "Organization" ADD COLUMN "pdfAppearance" JSONB;
