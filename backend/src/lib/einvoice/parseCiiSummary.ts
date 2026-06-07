/** Extraction minimale des champs CII / Factur-X (EN 16931) depuis le XML embarqué. */

export type CiiInvoiceSummary = {
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  currency: string;
  supplierName: string;
  supplierSiren: string | null;
  supplierSiret: string | null;
  supplierVat: string | null;
  buyerName: string | null;
  buyerSiren: string | null;
  subtotalHt: number;
  vatTotal: number;
  totalTtc: number;
};

function firstMatch(xml: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const m = xml.match(pattern);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

/** Contenu texte d'un élément XML (namespaces + attributs tolérés). */
function elementText(xml: string, localName: string): string | undefined {
  const re = new RegExp(`<(?:\\w+:)?${localName}\\b[^>]*>([^<]+)<\\/(?:\\w+:)?${localName}>`, 'i');
  return re.exec(xml)?.[1]?.trim();
}

function parseAmount(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function parseCiiDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 8) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    const dt = new Date(`${y}-${m}-${d}T12:00:00.000Z`);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const iso = raw.slice(0, 10);
  const dt = new Date(`${iso}T12:00:00.000Z`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function partyBlock(xml: string, role: 'Seller' | 'Buyer'): string {
  const re = new RegExp(
    `<(?:\\w+:)?ApplicableHeaderTradeAgreement>[\\s\\S]*?<(?:\\w+:)?${role}TradeParty>([\\s\\S]*?)<\\/(?:\\w+:)?${role}TradeParty>`,
    'i'
  );
  const m = xml.match(re);
  if (m?.[1]) return m[1];
  const loose = new RegExp(
    `<(?:\\w+:)?${role}TradeParty>([\\s\\S]*?)<\\/(?:\\w+:)?${role}TradeParty>`,
    'i'
  );
  return loose.exec(xml)?.[1] ?? '';
}

function partyName(block: string): string | undefined {
  return elementText(block, 'Name') ?? elementText(block, 'TradingBusinessName');
}

function partyLegalId(block: string, scheme: string): string | undefined {
  const re = new RegExp(
    `<(?:\\w+:)?ID[^>]*schemeID="${scheme}"[^>]*>([^<]+)<\\/(?:\\w+:)?ID>`,
    'i'
  );
  const m = block.match(re);
  if (!m?.[1]) return undefined;
  const digits = m[1].replace(/\D/g, '');
  if (scheme === '0002') return digits.length >= 9 ? digits.slice(0, 9) : undefined;
  if (scheme === '0009') return digits.length >= 14 ? digits.slice(0, 14) : undefined;
  return digits || undefined;
}

function partyVat(block: string): string | undefined {
  const re =
    /<(?:\w+:)?ID[^>]*schemeID="VA"[^>]*>([^<]+)<\/(?:\w+:)?ID>|<(?:\w+:)?ID[^>]*>(FR[A-Z0-9]+)<\/(?:\w+:)?ID>/i;
  const m = block.match(re);
  return m?.[1]?.replace(/\s/g, '').toUpperCase();
}

export function parseCiiInvoiceSummary(xml: string): CiiInvoiceSummary {
  const invoiceNumber =
    elementText(
      firstMatch(xml, [
        /<(?:\w+:)?ExchangedDocument\b[^>]*>([\s\S]*?)<\/(?:\w+:)?ExchangedDocument>/i,
      ]) ?? xml,
      'ID'
    ) ??
    elementText(xml, 'ID') ??
    'SANS-NUMERO';

  const exchangedDoc =
    firstMatch(xml, [
      /<(?:\w+:)?ExchangedDocument\b[^>]*>([\s\S]*?)<\/(?:\w+:)?ExchangedDocument>/i,
    ]) ?? xml;

  const issueRaw =
    firstMatch(exchangedDoc, [
      /<(?:\w+:)?IssueDateTime\b[^>]*>[\s\S]*?<(?:\w+:)?DateTimeString\b[^>]*>([^<]+)<\/(?:\w+:)?DateTimeString>/i,
      /<(?:\w+:)?DateTimeString\b[^>]*>([^<]+)<\/(?:\w+:)?DateTimeString>/i,
    ]) ?? elementText(exchangedDoc, 'DateTimeString');
  const issueDate = parseCiiDate(issueRaw) ?? new Date();

  const dueRaw = firstMatch(xml, [
    /<(?:\w+:)?DueDateDateTime\b[^>]*>[\s\S]*?<(?:\w+:)?DateTimeString\b[^>]*>([^<]+)<\/(?:\w+:)?DateTimeString>/i,
  ]);

  const currency =
    elementText(xml, 'InvoiceCurrencyCode') ??
    firstMatch(xml, [/currencyID="([A-Z]{3})"/i]) ??
    'EUR';

  const seller = partyBlock(xml, 'Seller');
  const buyer = partyBlock(xml, 'Buyer');

  const supplierName = partyName(seller) ?? 'Fournisseur inconnu';
  const supplierSiren = partyLegalId(seller, '0002') ?? partyLegalId(seller, '0009')?.slice(0, 9);
  const supplierSiret = partyLegalId(seller, '0009');
  const supplierVat = partyVat(seller);

  const buyerName = partyName(buyer) ?? null;
  const buyerSiren =
    partyLegalId(buyer, '0002') ?? partyLegalId(buyer, '0009')?.slice(0, 9) ?? null;

  const subtotalHt = parseAmount(
    elementText(xml, 'TaxBasisTotalAmount') ?? elementText(xml, 'LineTotalAmount')
  );

  const vatTotal = parseAmount(
    elementText(xml, 'TaxTotalAmount') ?? elementText(xml, 'CalculatedAmount')
  );

  const totalTtc = parseAmount(
    elementText(xml, 'GrandTotalAmount') ?? elementText(xml, 'DuePayableAmount')
  );

  const resolvedTtc = totalTtc > 0 ? totalTtc : subtotalHt + vatTotal;

  return {
    invoiceNumber,
    issueDate,
    dueDate: parseCiiDate(dueRaw),
    currency: currency.toUpperCase(),
    supplierName,
    supplierSiren: supplierSiren ?? null,
    supplierSiret: supplierSiret ?? null,
    supplierVat: supplierVat ?? null,
    buyerName,
    buyerSiren,
    subtotalHt,
    vatTotal,
    totalTtc: resolvedTtc,
  };
}
