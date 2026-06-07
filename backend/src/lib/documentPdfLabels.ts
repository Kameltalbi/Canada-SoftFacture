import type { DocumentLangCode } from './documentLanguage.js';

export type DocumentPdfLabels = {
  invoice: string;
  depositInvoice: string;
  creditNote: string;
  quote: string;
  quoteFor: string;
  date: string;
  numberPrefix: string;
  issuer: string;
  recipient: string;
  billTo: string;
  from: string;
  to: string;
  forLabel: string;
  description: string;
  service: string;
  qty: string;
  unitPrice: string;
  unitPriceShort: string;
  vat: string;
  total: string;
  amount: string;
  subtotalHt: string;
  vatLine: string;
  fiscalStamp: string;
  totalLabel: string;
  totalTtc: string;
  netToPay: string;
  advanceDeducted: string;
  advanceWithNumber: (n: string) => string;
  note: string;
  issueDate: string;
  currency: string;
  validUntil: string;
  amountInWordsTitle: string;
  mf: string;
  draft: string;
  clientLabel: string;
  unitPriceHtCol: string;
  vatPercentCol: string;
  lineTotalInclTax: string;
  creditNoteLinePrefix: string;
  creditNoteOnInvoice: (invoiceNumber: string) => string;
};

const LABELS: Record<DocumentLangCode, DocumentPdfLabels> = {
  fr: {
    invoice: 'FACTURE',
    depositInvoice: "FACTURE D'ACOMPTE",
    creditNote: 'AVOIR',
    quote: 'DEVIS',
    quoteFor: 'DEVIS POUR',
    date: 'Date',
    numberPrefix: 'N°',
    issuer: 'ÉMETTEUR',
    recipient: 'DESTINATAIRE',
    billTo: 'FACTURER À',
    from: 'DE',
    to: 'POUR',
    forLabel: 'POUR',
    description: 'Description',
    service: 'PRESTATION',
    qty: 'Qté',
    unitPrice: 'Prix unit.',
    unitPriceShort: 'PRIX UNIT.',
    vat: 'TPS/TVQ',
    total: 'Total',
    amount: 'MONTANT',
    subtotalHt: 'Sous-total avant taxes :',
    vatLine: 'TPS/TVQ :',
    fiscalStamp: 'Taxe :',
    totalLabel: 'TOTAL :',
    totalTtc: 'TOTAL après taxes',
    netToPay: 'MONTANT DÛ',
    advanceDeducted: 'Acompte déduit :',
    advanceWithNumber: (n) => `Acompte déduit (n° ${n}) :`,
    note: 'Note',
    issueDate: "DATE D'ÉMISSION",
    currency: 'DEVISE',
    validUntil: 'VALIDITÉ',
    amountInWordsTitle: 'Arrêté à la somme de',
    mf: 'NEQ/BN',
    draft: 'BROUILLON',
    clientLabel: 'Client :',
    unitPriceHtCol: 'PU av. taxes',
    vatPercentCol: 'Taxe %',
    lineTotalInclTax: 'Après taxes',
    creditNoteLinePrefix: 'Note de crédit —',
    creditNoteOnInvoice: (n) => `Note de crédit sur facture ${n}`,
  },
  en: {
    invoice: 'INVOICE',
    depositInvoice: 'DEPOSIT INVOICE',
    creditNote: 'CREDIT NOTE',
    quote: 'QUOTE',
    quoteFor: 'QUOTE FOR',
    date: 'Date',
    numberPrefix: 'No.',
    issuer: 'FROM',
    recipient: 'TO',
    billTo: 'BILL TO',
    from: 'FROM',
    to: 'TO',
    forLabel: 'FOR',
    description: 'Description',
    service: 'ITEM',
    qty: 'Qty',
    unitPrice: 'Unit price',
    unitPriceShort: 'UNIT PRICE',
    vat: 'GST/HST',
    total: 'Total',
    amount: 'AMOUNT',
    subtotalHt: 'Subtotal (before tax):',
    vatLine: 'GST/HST:',
    fiscalStamp: 'Tax:',
    totalLabel: 'TOTAL:',
    totalTtc: 'TOTAL (after tax)',
    netToPay: 'AMOUNT DUE',
    advanceDeducted: 'Deposit deducted:',
    advanceWithNumber: (n) => `Deposit deducted (no. ${n}):`,
    note: 'Note',
    issueDate: 'ISSUE DATE',
    currency: 'CURRENCY',
    validUntil: 'VALID UNTIL',
    amountInWordsTitle: 'Total amount',
    mf: 'BN/NEQ',
    draft: 'DRAFT',
    clientLabel: 'Customer:',
    unitPriceHtCol: 'Unit (excl. tax)',
    vatPercentCol: 'Tax %',
    lineTotalInclTax: 'After tax',
    creditNoteLinePrefix: 'Credit note —',
    creditNoteOnInvoice: (n) => `Credit note for invoice ${n}`,
  },
  de: {
    invoice: 'RECHNUNG',
    depositInvoice: 'ANZAHLUNGSRECHNUNG',
    creditNote: 'GUTSCHRIFT',
    quote: 'ANGEBOT',
    quoteFor: 'ANGEBOT FÜR',
    date: 'Datum',
    numberPrefix: 'Nr.',
    issuer: 'ABSENDER',
    recipient: 'EMPFÄNGER',
    billTo: 'RECHNUNG AN',
    from: 'VON',
    to: 'AN',
    forLabel: 'FÜR',
    description: 'Beschreibung',
    service: 'LEISTUNG',
    qty: 'Menge',
    unitPrice: 'Einzelpreis',
    unitPriceShort: 'EINZELPREIS',
    vat: 'MwSt.',
    total: 'Gesamt',
    amount: 'BETRAG',
    subtotalHt: 'Zwischensumme netto:',
    vatLine: 'MwSt.:',
    fiscalStamp: 'Stempelsteuer:',
    totalLabel: 'GESAMT:',
    totalTtc: 'GESAMT brutto',
    netToPay: 'ZU ZAHLEN',
    advanceDeducted: 'Anzahlung abgezogen:',
    advanceWithNumber: (n) => `Anzahlung abgezogen (Nr. ${n}):`,
    note: 'Hinweis',
    issueDate: 'AUSSTELLUNGSDATUM',
    currency: 'WÄHRUNG',
    validUntil: 'GÜLTIG BIS',
    amountInWordsTitle: 'Gesamtbetrag',
    mf: 'USt-IdNr.',
    draft: 'ENTWURF',
    clientLabel: 'Kunde:',
    unitPriceHtCol: 'EP netto',
    vatPercentCol: 'MwSt. %',
    lineTotalInclTax: 'Brutto',
    creditNoteLinePrefix: 'Gutschrift —',
    creditNoteOnInvoice: (n) => `Gutschrift zu Rechnung ${n}`,
  },
  es: {
    invoice: 'FACTURA',
    depositInvoice: 'FACTURA DE ANTICIPO',
    creditNote: 'NOTA DE CRÉDITO',
    quote: 'PRESUPUESTO',
    quoteFor: 'PRESUPUESTO PARA',
    date: 'Fecha',
    numberPrefix: 'N.º',
    issuer: 'EMISOR',
    recipient: 'DESTINATARIO',
    billTo: 'FACTURAR A',
    from: 'DE',
    to: 'PARA',
    forLabel: 'PARA',
    description: 'Descripción',
    service: 'CONCEPTO',
    qty: 'Cant.',
    unitPrice: 'Precio unit.',
    unitPriceShort: 'PRECIO UNIT.',
    vat: 'IVA',
    total: 'Total',
    amount: 'IMPORTE',
    subtotalHt: 'Subtotal sin IVA:',
    vatLine: 'IVA:',
    fiscalStamp: 'Timbre fiscal:',
    totalLabel: 'TOTAL:',
    totalTtc: 'TOTAL con IVA',
    netToPay: 'NETO A PAGAR',
    advanceDeducted: 'Anticipo deducido:',
    advanceWithNumber: (n) => `Anticipo deducido (n.º ${n}):`,
    note: 'Nota',
    issueDate: 'FECHA DE EMISIÓN',
    currency: 'MONEDA',
    validUntil: 'VÁLIDO HASTA',
    amountInWordsTitle: 'Importe total',
    mf: 'NIF',
    draft: 'BORRADOR',
    clientLabel: 'Cliente:',
    unitPriceHtCol: 'P. unit. s/IVA',
    vatPercentCol: 'IVA %',
    lineTotalInclTax: 'Con IVA',
    creditNoteLinePrefix: 'Abono —',
    creditNoteOnInvoice: (n) => `Nota de crédito de factura ${n}`,
  },
  it: {
    invoice: 'FATTURA',
    depositInvoice: 'FATTURA DI ACCONTO',
    creditNote: 'NOTA DI CREDITO',
    quote: 'PREVENTIVO',
    quoteFor: 'PREVENTIVO PER',
    date: 'Data',
    numberPrefix: 'N.',
    issuer: 'MITTENTE',
    recipient: 'DESTINATARIO',
    billTo: 'FATTURARE A',
    from: 'DA',
    to: 'A',
    forLabel: 'PER',
    description: 'Descrizione',
    service: 'PRESTAZIONE',
    qty: 'Qtà',
    unitPrice: 'Prezzo unit.',
    unitPriceShort: 'PREZZO UNIT.',
    vat: 'IVA',
    total: 'Totale',
    amount: 'IMPORTO',
    subtotalHt: 'Subtotale imponibile:',
    vatLine: 'IVA:',
    fiscalStamp: 'Imposta di bollo:',
    totalLabel: 'TOTALE:',
    totalTtc: 'TOTALE ivato',
    netToPay: 'NETTO DA PAGARE',
    advanceDeducted: 'Acconto dedotto:',
    advanceWithNumber: (n) => `Acconto dedotto (n. ${n}):`,
    note: 'Nota',
    issueDate: 'DATA DI EMISSIONE',
    currency: 'VALUTA',
    validUntil: 'VALIDO FINO AL',
    amountInWordsTitle: 'Importo totale',
    mf: 'P. IVA',
    draft: 'BOZZA',
    clientLabel: 'Cliente:',
    unitPriceHtCol: 'Prezzo netto',
    vatPercentCol: 'IVA %',
    lineTotalInclTax: 'Lordo',
    creditNoteLinePrefix: 'Nota credito —',
    creditNoteOnInvoice: (n) => `Nota di credito su fattura ${n}`,
  },
};

export function formatCreditNoteNotes(
  existingNotes: string | null | undefined,
  invoiceNumber: string,
  lang: DocumentLangCode
): string {
  const line = getDocumentPdfLabels(lang).creditNoteOnInvoice(invoiceNumber);
  return existingNotes?.trim() ? `${existingNotes.trim()}\n\n${line}` : line;
}

export function formatCreditNoteLineDescription(
  description: string,
  lang: DocumentLangCode
): string {
  return `${getDocumentPdfLabels(lang).creditNoteLinePrefix} ${description}`;
}

const DATE_LOCALES: Record<DocumentLangCode, string> = {
  fr: 'fr-CA',
  en: 'en-CA',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
};

export function getDocumentPdfLabels(lang: DocumentLangCode): DocumentPdfLabels {
  return LABELS[lang] ?? LABELS.fr;
}

export function formatDocumentDate(date: Date, lang: DocumentLangCode): string {
  return date.toLocaleDateString(DATE_LOCALES[lang] ?? 'fr-FR');
}
