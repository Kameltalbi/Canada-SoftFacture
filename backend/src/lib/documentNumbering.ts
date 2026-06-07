import type { Organization, Prisma } from '../generated/prisma/index.js';

export type DocumentNumberType = 'invoice' | 'quote' | 'deposit' | 'credit';

/** Modèles prédéfinis proposés dans les paramètres. */
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

const FORMAT_TOKEN = /\{([A-Z]+)(?::(\d+))?\}/g;
const SAFE_PREFIX = /^[A-Za-z0-9-]+$/;

export function sanitizePrefix(prefix: string, fallback: string): string {
  const trimmed = (prefix ?? fallback).trim() || fallback;
  return SAFE_PREFIX.test(trimmed) ? trimmed : fallback;
}

/** Vérifie que le modèle contient au moins un compteur séquentiel. */
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

export function normalizeNumberFormat(format: string, fallback: string): string {
  const trimmed = format.trim();
  return validateNumberFormat(trimmed) ? trimmed : fallback;
}

export type FormatNumberParams = {
  format: string;
  prefix: string;
  issueDate: Date;
  sequence: number;
};

/** Formate un numéro à partir du modèle et des variables. */
export function formatDocumentNumber(params: FormatNumberParams): string {
  const { format, prefix, issueDate, sequence } = params;
  const year = issueDate.getFullYear();
  const yy = String(year).slice(-2);
  const mm = String(issueDate.getMonth() + 1).padStart(2, '0');
  const safePrefix = sanitizePrefix(prefix, 'DOC');

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

type OrgCounters = Pick<
  Organization,
  | 'invoicePrefix'
  | 'invoiceSequence'
  | 'lastInvoiceYear'
  | 'invoiceNumberFormat'
  | 'invoiceResetYearly'
  | 'quotePrefix'
  | 'quoteSequence'
  | 'lastQuoteYear'
  | 'quoteNumberFormat'
  | 'quoteResetYearly'
  | 'depositPrefix'
  | 'depositSequence'
  | 'lastDepositYear'
  | 'depositNumberFormat'
  | 'depositResetYearly'
  | 'creditNotePrefix'
  | 'creditNoteSequence'
  | 'lastCreditNoteYear'
  | 'creditNoteNumberFormat'
  | 'creditNoteResetYearly'
>;

function readCounters(org: OrgCounters, type: DocumentNumberType) {
  if (type === 'invoice') {
    return {
      prefix: org.invoicePrefix,
      sequence: org.invoiceSequence,
      lastYear: org.lastInvoiceYear,
      format: normalizeNumberFormat(
        org.invoiceNumberFormat,
        NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4
      ),
      resetYearly: org.invoiceResetYearly,
      fallbackPrefix: 'FAC',
    };
  }
  if (type === 'deposit') {
    return {
      prefix: org.depositPrefix,
      sequence: org.depositSequence,
      lastYear: org.lastDepositYear,
      format: normalizeNumberFormat(
        org.depositNumberFormat,
        NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4
      ),
      resetYearly: org.depositResetYearly,
      fallbackPrefix: 'ACO',
    };
  }
  if (type === 'credit') {
    return {
      prefix: org.creditNotePrefix,
      sequence: org.creditNoteSequence,
      lastYear: org.lastCreditNoteYear,
      format: normalizeNumberFormat(
        org.creditNoteNumberFormat,
        NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4
      ),
      resetYearly: org.creditNoteResetYearly,
      fallbackPrefix: 'AVR',
    };
  }
  return {
    prefix: org.quotePrefix,
    sequence: org.quoteSequence,
    lastYear: org.lastQuoteYear,
    format: normalizeNumberFormat(org.quoteNumberFormat, NUMBER_FORMAT_PRESETS.PREFIX_YEAR_SEQ4),
    resetYearly: org.quoteResetYearly,
    fallbackPrefix: 'DEV',
  };
}

/** Aperçu du prochain numéro sans consommer le compteur. */
export function previewNextDocumentNumber(
  org: OrgCounters,
  type: DocumentNumberType,
  issueDate: Date
): { number: string; nextSequence: number; year: number } {
  const cfg = readCounters(org, type);
  const year = issueDate.getFullYear();
  let seq = cfg.sequence;
  if (cfg.resetYearly && cfg.lastYear !== year) {
    seq = 0;
  }
  const nextSequence = seq + 1;
  const number = formatDocumentNumber({
    format: cfg.format,
    prefix: cfg.prefix,
    issueDate,
    sequence: nextSequence,
  });
  return { number, nextSequence, year };
}

/**
 * Alloue le prochain numéro séquentiel (sans saut) dans une transaction.
 * Le compteur n'est incrémenté qu'à la validation du document.
 */
export async function allocateNextDocumentNumber(
  tx: Prisma.TransactionClient,
  params: { organizationId: string; type: DocumentNumberType; issueDate: Date }
): Promise<{ number: string; year: number; sequence: number }> {
  const org = await tx.organization.findUnique({ where: { id: params.organizationId } });
  if (!org) {
    throw new Error('ORG_NOT_FOUND');
  }

  const cfg = readCounters(org, params.type);
  const year = params.issueDate.getFullYear();
  let seq = cfg.sequence;
  let lastYear = cfg.lastYear;

  if (cfg.resetYearly && lastYear !== year) {
    seq = 0;
    lastYear = year;
  }

  seq += 1;

  const number = formatDocumentNumber({
    format: cfg.format,
    prefix: cfg.prefix,
    issueDate: params.issueDate,
    sequence: seq,
  });

  if (params.type === 'invoice') {
    await tx.organization.update({
      where: { id: org.id },
      data: { invoiceSequence: seq, lastInvoiceYear: lastYear },
    });
  } else if (params.type === 'deposit') {
    await tx.organization.update({
      where: { id: org.id },
      data: { depositSequence: seq, lastDepositYear: lastYear },
    });
  } else if (params.type === 'credit') {
    await tx.organization.update({
      where: { id: org.id },
      data: { creditNoteSequence: seq, lastCreditNoteYear: lastYear },
    });
  } else {
    await tx.organization.update({
      where: { id: org.id },
      data: { quoteSequence: seq, lastQuoteYear: lastYear },
    });
  }

  return { number, year, sequence: seq };
}
