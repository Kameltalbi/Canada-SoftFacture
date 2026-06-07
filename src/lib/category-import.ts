import { csvCellValue, detectCsvColumn, type CsvImportResult } from '@/lib/csv-import-helpers';

export type CategoryImportField = 'name' | 'sortOrder' | 'skip';

export type CategoryImportMapping = Record<CategoryImportField, number | null>;

export type CategoryImportRow = {
  name: string;
  sortOrder: number;
};

const FIELD_ALIASES: Record<Exclude<CategoryImportField, 'skip'>, string[]> = {
  name: ['nom', 'name', 'categorie', 'catégorie', 'category', 'libelle', 'libellé'],
  sortOrder: ['ordre', 'sort', 'sortorder', 'tri', 'position'],
};

export function defaultCategoryImportMapping(headers: string[]): CategoryImportMapping {
  return {
    name: detectCsvColumn(headers, FIELD_ALIASES.name),
    sortOrder: detectCsvColumn(headers, FIELD_ALIASES.sortOrder),
    skip: null,
  };
}

export function mapCategoryImportRows(
  rows: string[][],
  mapping: CategoryImportMapping
): { valid: CategoryImportRow[]; invalid: { line: number; reason: string }[] } {
  const valid: CategoryImportRow[] = [];
  const invalid: { line: number; reason: string }[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const name = csvCellValue(row, mapping.name);
    if (!name) {
      invalid.push({ line, reason: 'missingName' });
      return;
    }

    const sortRaw = csvCellValue(row, mapping.sortOrder);
    const sortOrder = sortRaw ? Number.parseInt(sortRaw, 10) : 0;

    valid.push({
      name,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    });
  });

  return { valid, invalid };
}

export const CATEGORY_IMPORT_FIELDS: Exclude<CategoryImportField, 'skip'>[] = ['name', 'sortOrder'];

export type { CsvImportResult };
