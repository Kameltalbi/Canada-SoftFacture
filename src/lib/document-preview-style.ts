import type { CSSProperties } from 'react';
import type { DocumentAppearanceConfig } from '@/lib/document-appearance';

export type DocumentPreviewTemplate = 'CLASSIC' | 'MODERN' | 'MINIMAL' | 'MONO' | 'BLUE_PRO';

export type DocumentPreviewStyleProps = {
  accentColor?: string;
  logoUrl?: string | null;
  template?: DocumentPreviewTemplate;
  fontFamily?: string;
  appearance?: DocumentAppearanceConfig;
};

export function catalogToPreviewTemplate(catalogId: string): DocumentPreviewTemplate {
  if (catalogId === 'MODERN') return 'MODERN';
  if (catalogId === 'CLASSIC') return 'CLASSIC';
  if (catalogId === 'MONO') return 'MONO';
  if (catalogId === 'BLUE_PRO') return 'BLUE_PRO';
  return 'MINIMAL';
}

export const APPEARANCE_COLOR_PRESETS = [
  '#039d77',
  '#2563eb',
  '#0f766e',
  '#059669',
  '#1e3a8a',
  '#1f2937',
  '#7c2d12',
] as const;

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length >= 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  return { r: 15, g: 118, b: 110 };
}

export function accentRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHexColor(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type DocumentPreviewColors = {
  accent: string;
  tintBg: string;
  tintBgMedium: string;
  border: string;
  borderStrong: string;
};

export function documentPreviewColors(accent: string): DocumentPreviewColors {
  return {
    accent,
    tintBg: accentRgba(accent, 0.1),
    tintBgMedium: accentRgba(accent, 0.16),
    border: accentRgba(accent, 0.3),
    borderStrong: accentRgba(accent, 0.55),
  };
}

export function previewDividerProps(
  template: DocumentPreviewTemplate,
  accent: string
): { className: string; style?: CSSProperties } {
  if (template === 'MONO' || template === 'BLUE_PRO') {
    return {
      className: 'my-6 border-b',
      style: { borderColor: '#e2e2dc' },
    };
  }
  return {
    className: 'my-6 border-b-2',
    style: { borderColor: accent },
  };
}

export function previewTableHeadProps(
  template: DocumentPreviewTemplate,
  accent: string
): { className: string; style?: CSSProperties } {
  if (template === 'MONO') {
    return {
      className: 'border-b text-slate-500',
      style: {
        backgroundColor: 'transparent',
        borderColor: '#e2e2dc',
        letterSpacing: '0.14em',
      },
    };
  }
  if (template === 'BLUE_PRO') {
    return {
      className: 'text-slate-500',
      style: {
        backgroundColor: '#eff4ff',
        borderColor: '#eff4ff',
        letterSpacing: '0.12em',
      },
    };
  }
  return {
    className: 'border-b-2 text-white',
    style: { backgroundColor: accent, borderColor: accent },
  };
}

export function previewSectionLabelStyle(colors: DocumentPreviewColors): CSSProperties {
  return { color: colors.accent };
}

export function previewRowBorderStyle(colors: DocumentPreviewColors): CSSProperties {
  return { borderBottom: `1px solid ${colors.border}` };
}

export function previewTotalsRowStyle(
  colors: DocumentPreviewColors,
  variant: 'default' | 'emphasis' = 'default'
): CSSProperties {
  if (variant === 'emphasis') {
    return {
      borderBottom: `1px solid ${colors.borderStrong}`,
      backgroundColor: colors.tintBg,
    };
  }
  return { borderBottom: `1px solid ${colors.border}` };
}

export function previewNotesBoxStyle(colors: DocumentPreviewColors): CSSProperties {
  return {
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.tintBg,
  };
}
