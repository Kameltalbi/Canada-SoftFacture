export const NUMBER_FORMAT_PRESETS = {
  PREFIX_YEAR_SEQ4: '{PREFIX}-{YYYY}-{SEQ:4}',
  PREFIX_YEAR_SEQ5: '{PREFIX}-{YYYY}-{SEQ:5}',
  PREFIX_YEAR_SEQ6: '{PREFIX}-{YYYY}-{SEQ:6}',
  YEAR_SEQ5: '{YYYY}-{SEQ:5}',
  PREFIX_SEQ6: '{PREFIX}-{SEQ:6}',
  PREFIX_YYMM_SEQ4: '{PREFIX}{YY}{MM}{SEQ:4}',
  PREFIX_SLASH_YEAR_SEQ: '{PREFIX}/{YYYY}/{SEQ:4}',
} as const;

export type NumberFormatPreset = keyof typeof NUMBER_FORMAT_PRESETS;

export type OrgNumbering = {
  invoicePrefix?: string;
  quotePrefix?: string;
  depositPrefix?: string;
  invoiceSequence?: number;
  quoteSequence?: number;
  depositSequence?: number;
  lastInvoiceYear?: number;
  lastQuoteYear?: number;
  lastDepositYear?: number;
  invoiceNumberFormat?: string;
  quoteNumberFormat?: string;
  depositNumberFormat?: string;
  invoiceResetYearly?: boolean;
  quoteResetYearly?: boolean;
  depositResetYearly?: boolean;
};

const FORMAT_TOKEN = /\{([A-Z]+)(?::(\d+))?\}/g;

export function validateNumberFormat(format: string): boolean {
  if (!format || format.length > 64) return false;
  FORMAT_TOKEN.lastIndex = 0;
  let hasSeq = false;
  let match: RegExpExecArray | null;
  while ((match = FORMAT_TOKEN.exec(format)) !== null) {
    const token = match[1];
    if (!['PREFIX', 'YYYY', 'YY', 'MM', 'SEQ'].includes(token)) return false;
    if (token === 'SEQ') hasSeq = true;
  }
  return hasSeq;
}

export function formatDocumentNumber(params: {
  format: string;
  prefix: string;
  issueDate: Date;
  sequence: number;
}): string {
  const { format, prefix, issueDate, sequence } = params;
  const year = issueDate.getFullYear();
  const yy = String(year).slice(-2);
  const mm = String(issueDate.getMonth() + 1).padStart(2, '0');
  const safePrefix = (prefix?.trim() || 'DOC').replace(/[^A-Za-z0-9-]/g, '') || 'DOC';

  FORMAT_TOKEN.lastIndex = 0;
  return format.replace(FORMAT_TOKEN, (_full, token: string, padStr?: string) => {
    switch (token) {
      case 'PREFIX':
        return safePrefix;
      case 'YYYY':
        return String(year);
      case 'YY':
        return yy;
      case 'MM':
        return mm;
      case 'SEQ': {
        const padding = padStr ? Math.min(Math.max(parseInt(padStr, 10) || 4, 1), 12) : 4;
        return String(sequence).padStart(padding, '0');
      }
      default:
        return '';
    }
  });
}

export function previewNextDocumentNumber(
  org: OrgNumbering,
  type: 'invoice' | 'quote' | 'deposit',
  issueDate: Date
): string {
  const isInvoice = type === 'invoice';
  const isDeposit = type === 'deposit';
  const prefix = isDeposit
    ? (org.depositPrefix ?? 'ACO')
    : isInvoice
      ? (org.invoicePrefix ?? 'FAC')
      : (org.quotePrefix ?? 'DEV');
  const sequence = isDeposit
    ? (org.depositSequence ?? 0)
    : isInvoice
      ? (org.invoiceSequence ?? 0)
      : (org.quoteSequence ?? 0);
  const lastYear = isDeposit
    ? (org.lastDepositYear ?? 0)
    : isInvoice
      ? (org.lastInvoiceYear ?? 0)
      : (org.lastQuoteYear ?? 0);
  const format = isDeposit
    ? (org.depositNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4)
    : isInvoice
      ? (org.invoiceNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4)
      : (org.quoteNumberFormat ?? NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4);
  const resetYearly = isDeposit
    ? (org.depositResetYearly ?? true)
    : isInvoice
      ? (org.invoiceResetYearly ?? true)
      : (org.quoteResetYearly ?? true);

  const year = issueDate.getFullYear();
  let seq = sequence;
  if (resetYearly && lastYear !== year) {
    seq = 0;
  }

  return formatDocumentNumber({
    format,
    prefix,
    issueDate,
    sequence: seq + 1,
  });
}

export function draftDocumentNumberPreview(
  org: OrgNumbering,
  type: 'invoice' | 'quote' | 'deposit',
  issueDate: Date
): string {
  const next = previewNextDocumentNumber(org, type, issueDate);
  return next.replace(/\d+$/, (m) => '?'.repeat(m.length));
}

/** Trouve la clé preset correspondant au format stocké, ou CUSTOM. */
export function presetKeyFromFormat(format: string): NumberFormatPreset | 'CUSTOM' {
  const entry = Object.entries(NUMBER_FORMAT_PRESETS).find(([, v]) => v === format);
  return (entry?.[0] as NumberFormatPreset) ?? 'CUSTOM';
}

export const FORMAT_TOKEN_HELP = [
  { token: '{PREFIX}', descKey: 'tokenPrefix' },
  { token: '{YYYY}', descKey: 'tokenYear' },
  { token: '{YY}', descKey: 'tokenYearShort' },
  { token: '{MM}', descKey: 'tokenMonth' },
  { token: '{SEQ:4}', descKey: 'tokenSeq' },
] as const;
