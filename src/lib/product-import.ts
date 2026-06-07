import {
  csvCellValue,
  detectCsvColumn,
  parseOptionalNumber,
  type CsvImportResult,
} from '@/lib/csv-import-helpers';

export type ProductImportField =
  | 'name'
  | 'kind'
  | 'unitPriceHt'
  | 'vatRate'
  | 'unit'
  | 'categoryName'
  | 'stockQuantity'
  | 'stockAlertThreshold'
  | 'description'
  | 'skip';

export type ProductImportMapping = Record<ProductImportField, number | null>;

export type ProductImportRow = {
  name: string;
  kind: 'PRODUCT' | 'SERVICE';
  description: string | null;
  unitPriceHt: number;
  vatRate: number;
  unit: string;
  categoryName: string | null;
  stockQuantity: number;
  stockAlertThreshold: number | null;
};

const FIELD_ALIASES: Record<Exclude<ProductImportField, 'skip'>, string[]> = {
  name: ['libelle', 'libellé', 'name', 'nom', 'produit', 'article', 'designation', 'désignation'],
  kind: ['type', 'kind', 'nature', 'produit/service'],
  unitPriceHt: ['prix ht', 'prix', 'unitprice', 'unit price', 'tarif', 'montant ht'],
  vatRate: ['tva', 'vat', 'taux tva', 'tax rate'],
  unit: ['unite', 'unité', 'unit', 'uom'],
  categoryName: ['categorie', 'catégorie', 'category', 'famille'],
  stockQuantity: ['stock', 'quantite', 'quantité', 'qty', 'quantity'],
  stockAlertThreshold: ['seuil', 'alerte', 'stock alert', 'seuil alerte'],
  description: ['description', 'desc', 'detail', 'détail'],
};

function parseKind(value: string): 'PRODUCT' | 'SERVICE' {
  const v = value.trim().toLowerCase();
  if (!v) return 'PRODUCT';
  if (v.includes('service') || v.includes('prestation') || v === 's') return 'SERVICE';
  return 'PRODUCT';
}

export function defaultProductImportMapping(headers: string[]): ProductImportMapping {
  return {
    name: detectCsvColumn(headers, FIELD_ALIASES.name),
    kind: detectCsvColumn(headers, FIELD_ALIASES.kind),
    unitPriceHt: detectCsvColumn(headers, FIELD_ALIASES.unitPriceHt),
    vatRate: detectCsvColumn(headers, FIELD_ALIASES.vatRate),
    unit: detectCsvColumn(headers, FIELD_ALIASES.unit),
    categoryName: detectCsvColumn(headers, FIELD_ALIASES.categoryName),
    stockQuantity: detectCsvColumn(headers, FIELD_ALIASES.stockQuantity),
    stockAlertThreshold: detectCsvColumn(headers, FIELD_ALIASES.stockAlertThreshold),
    description: detectCsvColumn(headers, FIELD_ALIASES.description),
    skip: null,
  };
}

export function mapProductImportRows(
  rows: string[][],
  mapping: ProductImportMapping
): { valid: ProductImportRow[]; invalid: { line: number; reason: string }[] } {
  const valid: ProductImportRow[] = [];
  const invalid: { line: number; reason: string }[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const name = csvCellValue(row, mapping.name);
    if (!name) {
      invalid.push({ line, reason: 'missingName' });
      return;
    }

    const unitPriceHt = parseOptionalNumber(csvCellValue(row, mapping.unitPriceHt));
    if (unitPriceHt === null || unitPriceHt < 0) {
      invalid.push({ line, reason: 'invalidPrice' });
      return;
    }

    const kind = parseKind(csvCellValue(row, mapping.kind));
    const vatRaw = parseOptionalNumber(csvCellValue(row, mapping.vatRate));
    const vatRate = vatRaw !== null && vatRaw >= 0 && vatRaw <= 100 ? vatRaw : 20;
    const unitCell = csvCellValue(row, mapping.unit);
    const unit = unitCell || (kind === 'SERVICE' ? 'forfait' : 'unité');
    const categoryName = csvCellValue(row, mapping.categoryName) || null;
    const stockQuantity =
      kind === 'PRODUCT' ? (parseOptionalNumber(csvCellValue(row, mapping.stockQuantity)) ?? 0) : 0;
    const alertRaw = parseOptionalNumber(csvCellValue(row, mapping.stockAlertThreshold));
    const description = csvCellValue(row, mapping.description) || null;

    valid.push({
      name,
      kind,
      description,
      unitPriceHt,
      vatRate,
      unit,
      categoryName,
      stockQuantity: stockQuantity >= 0 ? stockQuantity : 0,
      stockAlertThreshold: alertRaw !== null && alertRaw >= 0 ? alertRaw : null,
    });
  });

  return { valid, invalid };
}

export const PRODUCT_IMPORT_FIELDS: Exclude<ProductImportField, 'skip'>[] = [
  'name',
  'kind',
  'unitPriceHt',
  'vatRate',
  'unit',
  'categoryName',
  'stockQuantity',
  'stockAlertThreshold',
  'description',
];

export type { CsvImportResult };
