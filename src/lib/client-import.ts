import { parseCsv } from '@/lib/csv-parse';

export type ClientImportField =
  | 'name'
  | 'email'
  | 'phone'
  | 'siren'
  | 'taxId'
  | 'address'
  | 'city'
  | 'country'
  | 'skip';

export type ClientImportMapping = Record<ClientImportField, number | null>;

export type ClientImportRow = {
  name: string;
  email: string | null;
  phone: string | null;
  siren: string | null;
  taxId: string | null;
  address: string | null;
  city: string | null;
  country: string;
};

const FIELD_ALIASES: Record<Exclude<ClientImportField, 'skip'>, string[]> = {
  name: ['nom', 'name', 'raison sociale', 'client', 'societe', 'société', 'company', 'entreprise'],
  email: ['email', 'e-mail', 'mail', 'courriel'],
  phone: ['telephone', 'téléphone', 'tel', 'phone', 'mobile', 'gsm'],
  siren: ['siren'],
  taxId: ['siret', 'tva', 'nif', 'matricule', 'taxid', 'tax id', 'identifiant fiscal'],
  address: ['adresse', 'address', 'rue'],
  city: ['ville', 'city', 'localite', 'localité'],
  country: ['pays', 'country', 'code pays'],
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ');
}

function detectColumn(headers: string[], aliases: string[]): number | null {
  const normalized = headers.map(normalizeHeader);
  for (let i = 0; i < normalized.length; i += 1) {
    const header = normalized[i];
    if (aliases.some((alias) => header === alias || header.includes(alias))) {
      return i;
    }
  }
  return null;
}

export function defaultClientImportMapping(headers: string[]): ClientImportMapping {
  return {
    name: detectColumn(headers, FIELD_ALIASES.name),
    email: detectColumn(headers, FIELD_ALIASES.email),
    phone: detectColumn(headers, FIELD_ALIASES.phone),
    siren: detectColumn(headers, FIELD_ALIASES.siren),
    taxId: detectColumn(headers, FIELD_ALIASES.taxId),
    address: detectColumn(headers, FIELD_ALIASES.address),
    city: detectColumn(headers, FIELD_ALIASES.city),
    country: detectColumn(headers, FIELD_ALIASES.country),
    skip: null,
  };
}

function cellValue(row: string[], index: number | null): string {
  if (index === null || index < 0) return '';
  return (row[index] ?? '').trim();
}

function normalizeEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function mapClientImportRows(
  headers: string[],
  rows: string[][],
  mapping: ClientImportMapping
): { valid: ClientImportRow[]; invalid: { line: number; reason: string }[] } {
  const valid: ClientImportRow[] = [];
  const invalid: { line: number; reason: string }[] = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    const name = cellValue(row, mapping.name);
    if (!name) {
      invalid.push({ line, reason: 'missingName' });
      return;
    }

    const emailRaw = normalizeEmail(cellValue(row, mapping.email));
    if (emailRaw && !isValidEmail(emailRaw)) {
      invalid.push({ line, reason: 'invalidEmail' });
      return;
    }

    const country = cellValue(row, mapping.country).toUpperCase() || 'FR';

    valid.push({
      name,
      email: emailRaw,
      phone: cellValue(row, mapping.phone) || null,
      siren: cellValue(row, mapping.siren) || null,
      taxId: cellValue(row, mapping.taxId) || null,
      address: cellValue(row, mapping.address) || null,
      city: cellValue(row, mapping.city) || null,
      country: country.length === 2 ? country : 'FR',
    });
  });

  return { valid, invalid };
}

export function parseClientImportFile(text: string) {
  const parsed = parseCsv(text);
  const mapping = defaultClientImportMapping(parsed.headers);
  const mapped = mapClientImportRows(parsed.headers, parsed.rows, mapping);
  return { ...parsed, mapping, ...mapped };
}

export const CLIENT_IMPORT_FIELDS: Exclude<ClientImportField, 'skip'>[] = [
  'name',
  'email',
  'phone',
  'siren',
  'taxId',
  'address',
  'city',
  'country',
];
