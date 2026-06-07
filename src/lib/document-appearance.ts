/** Configuration d'apparence PDF (logo, visibilité) — miroir backend JSON. */

export type LogoPosition = 'left' | 'top' | 'header';

export type DocumentAppearanceConfig = {
  logoScale: number;
  logoPosition: LogoPosition;
  logoCentered: boolean;
  hideCompanyName: boolean;
  hideSlogan: boolean;
  hideAddress: boolean;
  hidePhone: boolean;
  hideEmail: boolean;
  hideWebsite: boolean;
  hideSiret: boolean;
  hideVat: boolean;
};

/** Plage du curseur taille logo (%). */
export const LOGO_SCALE_MIN = 25;
export const LOGO_SCALE_MAX = 300;
/** Hauteur de référence à 100 % (px dans l’aperçu A4). */
export const LOGO_BASE_HEIGHT_PX = 96;

export function clampLogoScale(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_DOCUMENT_APPEARANCE.logoScale;
  return Math.min(LOGO_SCALE_MAX, Math.max(LOGO_SCALE_MIN, Math.round(n)));
}

/** Dimensions affichées du logo selon le pourcentage choisi. */
export function logoDisplaySize(scale: number): { height: number; maxWidth: number } {
  const ratio = clampLogoScale(scale) / 100;
  const height = Math.round(LOGO_BASE_HEIGHT_PX * ratio);
  const maxWidth = Math.min(Math.round(420 * ratio), 560);
  return { height, maxWidth };
}

export const DEFAULT_DOCUMENT_APPEARANCE: DocumentAppearanceConfig = {
  logoScale: 100,
  logoPosition: 'left',
  logoCentered: false,
  hideCompanyName: false,
  hideSlogan: true,
  hideAddress: false,
  hidePhone: false,
  hideEmail: false,
  hideWebsite: false,
  hideSiret: false,
  hideVat: false,
};

export const PDF_FONT_FAMILIES = [
  'Open Sans',
  'Inter',
  'Roboto',
  'Lato',
  'Montserrat',
  'Merriweather',
  'Playfair Display',
  'Source Sans 3',
] as const;

export type PdfFontFamily = (typeof PDF_FONT_FAMILIES)[number];

/** Presets Constructor (8 pastilles). */
export const APPEARANCE_COLOR_SWATCHES = [
  '#f97316',
  '#eab308',
  '#84cc16',
  '#14b8a6',
  '#0ea5e9',
  '#2563eb',
  '#6366f1',
  '#374151',
] as const;

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asLogoPosition(value: unknown): LogoPosition {
  if (value === 'top' || value === 'header') return value;
  return 'left';
}

export type AppearanceDocScope = 'invoice' | 'quote' | 'other';
export type AppearanceMode = 'unified' | 'per_document';

export type PdfAppearanceStore = {
  mode: AppearanceMode;
  unified: DocumentAppearanceConfig;
  invoice?: DocumentAppearanceConfig;
  quote?: DocumentAppearanceConfig;
  other?: DocumentAppearanceConfig;
};

const LOGO_KEYS: (keyof DocumentAppearanceConfig)[] = ['logoScale', 'logoPosition', 'logoCentered'];

function isLogoPatch(patch: Partial<DocumentAppearanceConfig>): boolean {
  return Object.keys(patch).some((k) => LOGO_KEYS.includes(k as keyof DocumentAppearanceConfig));
}

export function parsePdfAppearanceStore(raw: unknown): PdfAppearanceStore {
  if (!raw || typeof raw !== 'object') {
    return { mode: 'unified', unified: { ...DEFAULT_DOCUMENT_APPEARANCE } };
  }
  const o = raw as Record<string, unknown>;
  if (o.mode === 'per_document') {
    return {
      mode: 'per_document',
      unified: parseDocumentAppearance(o.unified ?? DEFAULT_DOCUMENT_APPEARANCE),
      invoice: o.invoice != null ? parseDocumentAppearance(o.invoice) : undefined,
      quote: o.quote != null ? parseDocumentAppearance(o.quote) : undefined,
      other: o.other != null ? parseDocumentAppearance(o.other) : undefined,
    };
  }
  if ('logoScale' in o) {
    return { mode: 'unified', unified: parseDocumentAppearance(raw) };
  }
  return {
    mode: 'unified',
    unified: parseDocumentAppearance(o.unified ?? DEFAULT_DOCUMENT_APPEARANCE),
  };
}

/** Apparence effective pour l’aperçu / l’édition (logo toujours depuis unified). */
export function getEffectiveAppearance(
  store: PdfAppearanceStore,
  scope: AppearanceDocScope
): DocumentAppearanceConfig {
  const scoped = store.mode === 'per_document' ? (store[scope] ?? store.unified) : store.unified;
  return {
    ...scoped,
    logoScale: store.unified.logoScale,
    logoPosition: store.unified.logoPosition,
    logoCentered: store.unified.logoCentered,
  };
}

export function serializePdfAppearanceStore(store: PdfAppearanceStore): Record<string, unknown> {
  if (store.mode === 'per_document') {
    return {
      mode: 'per_document',
      unified: store.unified,
      ...(store.invoice ? { invoice: store.invoice } : {}),
      ...(store.quote ? { quote: store.quote } : {}),
      ...(store.other ? { other: store.other } : {}),
    };
  }
  return { mode: 'unified', unified: store.unified };
}

export function patchAppearanceStore(
  store: PdfAppearanceStore,
  scope: AppearanceDocScope,
  patch: Partial<DocumentAppearanceConfig>,
  allowPerDocument: boolean
): PdfAppearanceStore {
  if (isLogoPatch(patch)) {
    return { ...store, unified: { ...store.unified, ...patch } };
  }
  if (allowPerDocument && store.mode === 'per_document') {
    const current = store[scope] ?? store.unified;
    return { ...store, [scope]: { ...current, ...patch } };
  }
  return { ...store, unified: { ...store.unified, ...patch } };
}

export function parseDocumentAppearance(raw: unknown): DocumentAppearanceConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_DOCUMENT_APPEARANCE };
  const o = raw as Record<string, unknown>;
  return {
    logoScale: clampLogoScale(o.logoScale),
    logoPosition: asLogoPosition(o.logoPosition),
    logoCentered: asBool(o.logoCentered, DEFAULT_DOCUMENT_APPEARANCE.logoCentered),
    hideCompanyName: asBool(o.hideCompanyName, DEFAULT_DOCUMENT_APPEARANCE.hideCompanyName),
    hideSlogan: asBool(o.hideSlogan, DEFAULT_DOCUMENT_APPEARANCE.hideSlogan),
    hideAddress: asBool(o.hideAddress, DEFAULT_DOCUMENT_APPEARANCE.hideAddress),
    hidePhone: asBool(o.hidePhone, DEFAULT_DOCUMENT_APPEARANCE.hidePhone),
    hideEmail: asBool(o.hideEmail, DEFAULT_DOCUMENT_APPEARANCE.hideEmail),
    hideWebsite: asBool(o.hideWebsite, DEFAULT_DOCUMENT_APPEARANCE.hideWebsite),
    hideSiret: asBool(o.hideSiret, DEFAULT_DOCUMENT_APPEARANCE.hideSiret),
    hideVat: asBool(o.hideVat, DEFAULT_DOCUMENT_APPEARANCE.hideVat),
  };
}

export function normalizePdfFontFamily(value: string | null | undefined): PdfFontFamily {
  if (value && PDF_FONT_FAMILIES.includes(value as PdfFontFamily)) {
    return value as PdfFontFamily;
  }
  return 'Open Sans';
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  return rgbToHex(
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount
  );
}

/** Variantes de couleur pour « suggestions automatiques ». */
export function suggestAccentColors(baseHex: string): string[] {
  const base = baseHex.toLowerCase();
  return [
    base,
    mix(base, [255, 255, 255], 0.25),
    mix(base, [0, 0, 0], 0.2),
    mix(base, [255, 255, 255], 0.45),
    mix(base, [0, 0, 0], 0.35),
  ];
}

export function googleFontStylesheetHref(family: string): string {
  const encoded = family.trim().replace(/\s+/g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap`;
}
