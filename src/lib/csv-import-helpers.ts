export type CsvImportResult = {
  created: number;
  skipped: number;
  errors: { line: number; message: string }[];
};

export function normalizeCsvHeader(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ');
}

export function detectCsvColumn(headers: string[], aliases: string[]): number | null {
  const normalized = headers.map(normalizeCsvHeader);
  for (let i = 0; i < normalized.length; i += 1) {
    const header = normalized[i];
    if (aliases.some((alias) => header === alias || header.includes(alias))) {
      return i;
    }
  }
  return null;
}

export function csvCellValue(row: string[], index: number | null): string {
  if (index === null || index < 0) return '';
  return (row[index] ?? '').trim();
}

export function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
