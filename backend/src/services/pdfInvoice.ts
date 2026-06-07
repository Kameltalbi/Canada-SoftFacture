import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { PdfDocumentTemplate } from '../generated/prisma/index.js';
import { amountToFrenchWords } from '../lib/amountInWords.js';
import type { DocumentLangCode } from '../lib/documentLanguage.js';
import {
  formatDocumentDate,
  getDocumentPdfLabels,
  type DocumentPdfLabels,
} from '../lib/documentPdfLabels.js';
import { SIDE_MARGIN, finalizeBufferedFooters, contentMaxY } from './pdfLayout.js';
import { drawOrgLogo } from '../lib/pdfLogo.js';

export type InvoicePdfInput = {
  number: string;
  kind?: 'STANDARD' | 'DEPOSIT' | 'CREDIT_NOTE';
  documentLanguage?: DocumentLangCode;
  creditedInvoiceNumber?: string | null;
  issueDate: Date;
  notes?: string | null;
  currency: string;
  applyVat?: boolean;
  applyFiscalStamp?: boolean;
  fiscalStamp?: string;
  discountEnabled?: boolean;
  discountRate?: string;
  showCurrencyOnLines?: boolean;
  advanceDeduction?: string;
  netToPay?: string;
  appliedDepositNumber?: string | null;
  template: PdfDocumentTemplate;
  /** Couleur d'accent (#RRGGBB), selon le plan et les paramètres org */
  accentColor?: string;
  footerText?: string | null;
  defaultFooterLine: string;
  org: {
    name: string;
    logoUrl: string | null;
    taxMatricule: string | null;
    address: string | null;
    city: string | null;
  };
  client: { name: string; taxId: string | null };
  lines: {
    description: string;
    quantity: string;
    unitPriceHt: string;
    taxRate: string;
    lineTotalHt: string;
    lineVat: string;
    lineTotalTtc: string;
  }[];
  subtotalHt: string;
  vatTotal: string;
  totalTtc: string;
};

const COL = {
  desc: SIDE_MARGIN,
  descW: 220,
  qty: 280,
  qtyW: 40,
  puh: 330,
  puhW: 60,
  tvap: 400,
  tvapW: 40,
  ttc: 450,
  ttcW: 80,
};

function invoiceFooterDisplay(inv: InvoicePdfInput): string {
  return inv.footerText && inv.footerText.trim().length > 0
    ? inv.footerText.trim()
    : inv.defaultFooterLine;
}

function docAccent(inv: InvoicePdfInput): string {
  return inv.accentColor ?? '#0f766e';
}

function pdfLang(inv: InvoicePdfInput): DocumentLangCode {
  return inv.documentLanguage ?? 'fr';
}

function invoiceDocTitle(inv: InvoicePdfInput): string {
  const L = getDocumentPdfLabels(pdfLang(inv));
  if (inv.kind === 'DEPOSIT') return L.depositInvoice;
  if (inv.kind === 'CREDIT_NOTE') return L.creditNote;
  return L.invoice;
}

function hasAdvanceDeduction(inv: InvoicePdfInput): boolean {
  return parseFloat(inv.advanceDeduction ?? '0') > 0.0005;
}

function amountForWords(inv: InvoicePdfInput): string {
  if (hasAdvanceDeduction(inv)) {
    return inv.netToPay ?? inv.totalTtc;
  }
  return inv.totalTtc;
}

function drawAdvanceAndNetClassic(
  doc: InstanceType<typeof PDFDocument>,
  inv: InvoicePdfInput,
  totalsX: number,
  totalsW: number,
  afterTotalY: number,
  L: DocumentPdfLabels,
  accent: string
): number {
  if (!hasAdvanceDeduction(inv)) return afterTotalY + 36;
  let y = afterTotalY + 28;
  doc.fillColor('#475569').fontSize(10).font('Helvetica');
  const label = inv.appliedDepositNumber
    ? L.advanceWithNumber(inv.appliedDepositNumber)
    : L.advanceDeducted;
  doc.text(label, totalsX, y, { width: totalsW - 90, align: 'right', lineBreak: false });
  doc.text(`- ${inv.advanceDeduction} ${inv.currency}`, totalsX + totalsW - 85, y, {
    width: 85,
    align: 'right',
    lineBreak: false,
  });
  y += 24;
  doc.rect(totalsX, y, totalsW, 24).fill(accent);
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
  doc.text(`${L.netToPay}:`, totalsX + 10, y + 6, {
    width: totalsW - 105,
    align: 'right',
    lineBreak: false,
  });
  doc.text(`${inv.netToPay} ${inv.currency}`, totalsX + totalsW - 85, y + 6, {
    width: 80,
    align: 'right',
    lineBreak: false,
  });
  doc.font('Helvetica');
  return y + 36;
}

function moneyText(amount: string, currency: string, showCurrency = true): string {
  return showCurrency ? `${amount} ${currency}` : amount;
}

function drawAmountInWordsBox(
  doc: InstanceType<typeof PDFDocument>,
  inv: InvoicePdfInput,
  amount: string,
  currency: string,
  y: number,
  L: DocumentPdfLabels
): number {
  if (y + 28 > contentMaxY(doc)) return y;
  const width = doc.page.width - 2 * SIDE_MARGIN;
  doc.roundedRect(SIDE_MARGIN, y, width, 26, 3).fill('#f8fafc');
  const lang = pdfLang(inv);
  const words =
    lang === 'fr'
      ? amountToFrenchWords(amount, currency)
      : `${L.amountInWordsTitle}: ${amount} ${currency}`;
  doc
    .fillColor('#334155')
    .fontSize(9)
    .font('Helvetica-Oblique')
    .text(words, SIDE_MARGIN + 10, y + 8, {
      width: width - 20,
      align: 'center',
      lineBreak: false,
    });
  doc.font('Helvetica');
  return y + 34;
}

function drawNoteBox(
  doc: InstanceType<typeof PDFDocument>,
  notes: string | null | undefined,
  y: number,
  L: DocumentPdfLabels
): number {
  const text = notes?.trim();
  if (!text) return y;
  if (y + 54 > contentMaxY(doc)) return y;
  const width = doc.page.width - 2 * SIDE_MARGIN;
  doc.roundedRect(SIDE_MARGIN, y, width, 46, 4).fill('#f8fafc').stroke('#e2e8f0');
  doc
    .font('Helvetica-Bold')
    .fontSize(8)
    .fillColor('#475569')
    .text(L.note, SIDE_MARGIN + 10, y + 8, {
      lineBreak: false,
    });
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#334155')
    .text(text, SIDE_MARGIN + 10, y + 22, {
      width: width - 20,
      height: 18,
      lineBreak: false,
    });
  return y + 54;
}

function drawTableHeaderClassic(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  L: DocumentPdfLabels,
  accent: string
): number {
  const w = doc.page.width - 2 * SIDE_MARGIN;
  // Header background
  doc.rect(SIDE_MARGIN, y, w, 22).fill(accent);
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  doc.text(L.description, SIDE_MARGIN + 8, y + 7, { width: 200, lineBreak: false });
  doc.text(L.unitPrice, 300, y + 7, { width: 70, align: 'right', lineBreak: false });
  doc.text(L.qty, 375, y + 7, { width: 40, align: 'center', lineBreak: false });
  doc.text(L.vat, 420, y + 7, { width: 50, align: 'center', lineBreak: false });
  doc.text(L.total, 475, y + 7, { width: 70, align: 'right', lineBreak: false });
  doc.font('Helvetica');
  return y + 28;
}

function drawLinesClassic(
  doc: InstanceType<typeof PDFDocument>,
  lines: InvoicePdfInput['lines'],
  tableTopY: number,
  currency: string,
  showCurrency: boolean,
  L: DocumentPdfLabels,
  accent: string
): number {
  let y = drawTableHeaderClassic(doc, tableTopY, L, accent);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (y + 28 > contentMaxY(doc)) {
      doc.addPage();
      y = drawTableHeaderClassic(doc, SIDE_MARGIN, L, accent);
    }
    // Alternate row background
    if (i % 2 === 0) {
      const w = doc.page.width - 2 * SIDE_MARGIN;
      doc.rect(SIDE_MARGIN, y - 2, w, 24).fill('#f8fafc');
    }
    doc.fillColor('#1e293b').fontSize(9);
    doc.text(l.description, SIDE_MARGIN + 8, y + 4, { width: 200, lineBreak: false });
    doc.text(moneyText(l.unitPriceHt, currency, showCurrency), 300, y + 4, {
      width: 70,
      align: 'right',
      lineBreak: false,
    });
    doc.text(l.quantity, 375, y + 4, { width: 40, align: 'center', lineBreak: false });
    doc.text(`${l.taxRate}%`, 420, y + 4, { width: 50, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').text(moneyText(l.lineTotalTtc, currency, showCurrency), 475, y + 4, {
      width: 70,
      align: 'right',
      lineBreak: false,
    });
    doc.font('Helvetica');
    y += 24;
  }
  // Bottom border
  doc
    .moveTo(SIDE_MARGIN, y)
    .lineTo(doc.page.width - SIDE_MARGIN, y)
    .stroke('#e2e8f0');
  return y;
}

function renderClassic(doc: InstanceType<typeof PDFDocument>, inv: InvoicePdfInput): void {
  const L = getDocumentPdfLabels(pdfLang(inv));
  const accent = docAccent(inv);
  const w = doc.page.width;
  const rightCol = w - SIDE_MARGIN;

  // === HEADER ===
  // Company name/logo (top-left)
  const hasLogo = drawOrgLogo(doc, inv.org.logoUrl, SIDE_MARGIN, SIDE_MARGIN - 10, {
    fit: [190, 78],
  });
  if (!hasLogo) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(accent)
      .text(inv.org.name, SIDE_MARGIN, SIDE_MARGIN, { lineBreak: false });
  }
  doc.font('Helvetica');

  // FACTURE title (top-right)
  doc
    .fontSize(28)
    .font('Helvetica-Bold')
    .fillColor(accent)
    .text(invoiceDocTitle(inv), SIDE_MARGIN, SIDE_MARGIN, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#475569')
    .text(`${L.numberPrefix} ${inv.number}`, SIDE_MARGIN, SIDE_MARGIN + 34, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  doc.text(
    `${L.date}: ${formatDocumentDate(inv.issueDate, pdfLang(inv))}`,
    SIDE_MARGIN,
    SIDE_MARGIN + 48,
    {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    }
  );

  // === ÉMETTEUR / DESTINATAIRE boxes ===
  const boxTop = SIDE_MARGIN + 75;
  const boxW = (w - 2 * SIDE_MARGIN - 20) / 2;
  const boxH = 90;

  // Émetteur box
  doc.rect(SIDE_MARGIN, boxTop, boxW, boxH).stroke('#e2e8f0');
  doc.rect(SIDE_MARGIN, boxTop, boxW, 20).fill(accent);
  doc
    .fillColor('#ffffff')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(L.issuer, SIDE_MARGIN + 10, boxTop + 6, { lineBreak: false });
  doc.font('Helvetica').fillColor('#1e293b').fontSize(10);
  let ey = boxTop + 28;
  doc.font('Helvetica-Bold').text(inv.org.name, SIDE_MARGIN + 10, ey, { lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor('#475569');
  ey += 14;
  if (inv.org.address) {
    doc.text(inv.org.address, SIDE_MARGIN + 10, ey, { lineBreak: false });
    ey += 12;
  }
  if (inv.org.city) {
    doc.text(inv.org.city, SIDE_MARGIN + 10, ey, { lineBreak: false });
    ey += 12;
  }
  if (inv.org.taxMatricule) {
    doc.text(`${L.mf}: ${inv.org.taxMatricule}`, SIDE_MARGIN + 10, ey, { lineBreak: false });
  }

  // Destinataire box
  const destX = SIDE_MARGIN + boxW + 20;
  doc.rect(destX, boxTop, boxW, boxH).stroke('#e2e8f0');
  doc.rect(destX, boxTop, boxW, 20).fill(accent);
  doc
    .fillColor('#ffffff')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text(L.recipient, destX + 10, boxTop + 6, { lineBreak: false });
  doc.font('Helvetica').fillColor('#1e293b').fontSize(10);
  let dy = boxTop + 28;
  doc.font('Helvetica-Bold').text(inv.client.name, destX + 10, dy, { lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor('#475569');
  dy += 14;
  if (inv.client.taxId) {
    doc.text(`${L.mf}: ${inv.client.taxId}`, destX + 10, dy, { lineBreak: false });
  }

  // === TABLE ===
  const tableTop = boxTop + boxH + 25;
  const afterTable = drawLinesClassic(
    doc,
    inv.lines,
    tableTop,
    inv.currency,
    inv.showCurrencyOnLines ?? true,
    L,
    accent
  );

  // === TOTALS ===
  let yTotals = afterTable + 20;
  if (yTotals + 100 > contentMaxY(doc)) {
    doc.addPage();
    yTotals = SIDE_MARGIN + 40;
  }

  const totalsX = 340;
  const totalsW = rightCol - totalsX;

  doc.fillColor('#475569').fontSize(10);
  doc.text(L.subtotalHt, totalsX, yTotals, {
    width: totalsW - 90,
    align: 'right',
    lineBreak: false,
  });
  doc.text(`${inv.subtotalHt} ${inv.currency}`, totalsX + totalsW - 85, yTotals, {
    width: 85,
    align: 'right',
    lineBreak: false,
  });

  doc.text(L.vatLine, totalsX, yTotals + 18, {
    width: totalsW - 90,
    align: 'right',
    lineBreak: false,
  });
  doc.text(`${inv.vatTotal} ${inv.currency}`, totalsX + totalsW - 85, yTotals + 18, {
    width: 85,
    align: 'right',
    lineBreak: false,
  });

  // TOTAL highlighted row
  const totalRowY = yTotals + (inv.applyFiscalStamp ? 58 : 40);
  if (inv.applyFiscalStamp) {
    doc.text(L.fiscalStamp, totalsX, yTotals + 36, {
      width: totalsW - 90,
      align: 'right',
      lineBreak: false,
    });
    doc.text(
      `${inv.fiscalStamp ?? '1.000'} ${inv.currency}`,
      totalsX + totalsW - 85,
      yTotals + 36,
      {
        width: 85,
        align: 'right',
        lineBreak: false,
      }
    );
  }
  doc.rect(totalsX, totalRowY, totalsW, 24).fill(accent);
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold');
  doc.text(L.totalLabel, totalsX + 10, totalRowY + 6, {
    width: totalsW - 105,
    align: 'right',
    lineBreak: false,
  });
  doc.text(`${inv.totalTtc} ${inv.currency}`, totalsX + totalsW - 85, totalRowY + 6, {
    width: 80,
    align: 'right',
    lineBreak: false,
  });
  doc.font('Helvetica');

  const afterWordsY = drawAdvanceAndNetClassic(doc, inv, totalsX, totalsW, totalRowY, L, accent);
  drawAmountInWordsBox(doc, inv, amountForWords(inv), inv.currency, afterWordsY, L);
  drawNoteBox(doc, inv.notes, afterWordsY + 40, L);
}

function drawTableHeaderModern(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  L: DocumentPdfLabels,
  accent: string
): number {
  const w = doc.page.width - 2 * SIDE_MARGIN;
  doc.rect(SIDE_MARGIN, y, w, 24).fill(accent);
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  doc.text(L.service, SIDE_MARGIN + 8, y + 8, { width: 270, lineBreak: false });
  doc.text(L.qty, 344, y + 8, { width: 40, align: 'right', lineBreak: false });
  doc.text(L.unitPriceShort, 406, y + 8, { width: 75, align: 'right', lineBreak: false });
  doc.text(L.total, 492, y + 8, { width: 58, align: 'right', lineBreak: false });
  doc.font('Helvetica');
  return y + 28;
}

function drawLinesModern(
  doc: InstanceType<typeof PDFDocument>,
  lines: InvoicePdfInput['lines'],
  tableTopY: number,
  currency: string,
  showCurrency: boolean,
  L: DocumentPdfLabels,
  accent: string
): number {
  let y = drawTableHeaderModern(doc, tableTopY, L, accent);
  for (const l of lines) {
    if (y + 22 > contentMaxY(doc)) {
      doc.addPage();
      y = drawTableHeaderModern(doc, SIDE_MARGIN, L, accent);
    }
    doc.fillColor('#1f2937').fontSize(9).font('Helvetica-Bold');
    doc.text(l.description, SIDE_MARGIN, y, { width: 270, lineBreak: false });
    doc.fillColor('#94a3b8').font('Helvetica-Bold');
    doc.text(l.quantity, 344, y, { width: 40, align: 'right', lineBreak: false });
    doc.text(moneyText(l.unitPriceHt, currency, showCurrency), 392, y, {
      width: 89,
      align: 'right',
      lineBreak: false,
    });
    doc.fillColor('#1f2937');
    doc.text(moneyText(l.lineTotalTtc, currency, showCurrency), 482, y, {
      width: 68,
      align: 'right',
      lineBreak: false,
    });
    doc
      .moveTo(SIDE_MARGIN, y + 22)
      .lineTo(doc.page.width - SIDE_MARGIN, y + 22)
      .stroke('#e2e8f0');
    y += 34;
  }
  return y;
}

function renderModern(doc: InstanceType<typeof PDFDocument>, inv: InvoicePdfInput): void {
  const L = getDocumentPdfLabels(pdfLang(inv));
  const accent = docAccent(inv);
  const w = doc.page.width;
  const blue = accent;
  const lightBlue = '#dbeafe';
  const top = SIDE_MARGIN + 28;

  const hasLogo = drawOrgLogo(doc, inv.org.logoUrl, SIDE_MARGIN, top - 10, { fit: [190, 70] });
  if (!hasLogo) {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(blue)
      .text(inv.org.name.toUpperCase(), SIDE_MARGIN, top, { width: 260, lineBreak: false });
  }
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#64748b')
    .text([inv.org.address, inv.org.city].filter(Boolean).join(', '), SIDE_MARGIN, top + 26, {
      width: 260,
      lineBreak: false,
    });

  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text(invoiceDocTitle(inv), SIDE_MARGIN, top - 8, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(blue)
    .text(`${L.numberPrefix} ${inv.number}`, SIDE_MARGIN, top + 25, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });

  const metaY = top + 70;
  doc
    .moveTo(SIDE_MARGIN, metaY)
    .lineTo(w - SIDE_MARGIN, metaY)
    .stroke(blue);
  doc.rect(SIDE_MARGIN, metaY + 1, w - 2 * SIDE_MARGIN, 40).fill(lightBlue);
  const meta = [
    [L.issueDate, formatDocumentDate(inv.issueDate, pdfLang(inv))],
    [L.currency, inv.currency],
  ];
  meta.forEach(([label, value], index) => {
    const x = SIDE_MARGIN + 12 + index * 170;
    doc
      .fontSize(7)
      .font('Helvetica-Bold')
      .fillColor(blue)
      .text(label, x, metaY + 12, { width: 130 });
    doc
      .fontSize(9)
      .fillColor('#1f2937')
      .text(value, x, metaY + 25, { width: 130, lineBreak: false });
  });

  const partyY = metaY + 78;
  doc
    .moveTo(SIDE_MARGIN, partyY)
    .lineTo(SIDE_MARGIN, partyY + 58)
    .stroke(blue);
  doc
    .fontSize(7)
    .font('Helvetica-Bold')
    .fillColor(blue)
    .text(L.from, SIDE_MARGIN + 12, partyY + 8);
  doc
    .fontSize(10)
    .fillColor('#1f2937')
    .text(inv.org.name, SIDE_MARGIN + 12, partyY + 24, {
      width: 210,
      lineBreak: false,
    });
  doc.fontSize(8).fillColor('#64748b').font('Helvetica');
  if (inv.org.address)
    doc.text(inv.org.address, SIDE_MARGIN + 12, partyY + 39, { width: 210, lineBreak: false });
  if (inv.org.taxMatricule)
    doc.text(`${L.mf} ${inv.org.taxMatricule}`, SIDE_MARGIN + 12, partyY + 51, { width: 210 });

  const clientX = SIDE_MARGIN + 280;
  doc
    .moveTo(clientX, partyY)
    .lineTo(clientX, partyY + 58)
    .stroke('#93c5fd');
  doc
    .fontSize(7)
    .font('Helvetica-Bold')
    .fillColor(blue)
    .text(L.to, clientX + 12, partyY + 8);
  doc
    .fontSize(10)
    .fillColor('#1f2937')
    .text(inv.client.name, clientX + 12, partyY + 24, {
      width: 210,
      lineBreak: false,
    });
  if (inv.client.taxId)
    doc
      .fontSize(8)
      .fillColor('#64748b')
      .text(`${L.mf} ${inv.client.taxId}`, clientX + 12, partyY + 39);

  const afterTable = drawLinesModern(
    doc,
    inv.lines,
    partyY + 96,
    inv.currency,
    inv.showCurrencyOnLines ?? true,
    L,
    accent
  );
  let yTotals = afterTable + 22;
  if (yTotals + 108 > contentMaxY(doc)) {
    doc.addPage();
    yTotals = SIDE_MARGIN + 36;
  }
  const totalsX = w - SIDE_MARGIN - 205;
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#94a3b8');
  doc.text(L.subtotalHt.replace(':', ''), totalsX, yTotals, { width: 92, lineBreak: false });
  doc.text(`${inv.subtotalHt} ${inv.currency}`, totalsX + 105, yTotals, {
    width: 100,
    align: 'right',
    lineBreak: false,
  });
  doc.text(L.vat, totalsX, yTotals + 22, { width: 92, lineBreak: false });
  doc.text(`${inv.vatTotal} ${inv.currency}`, totalsX + 105, yTotals + 22, {
    width: 100,
    align: 'right',
    lineBreak: false,
  });
  doc.rect(totalsX - 8, yTotals + 44, 213, 28).fill(lightBlue);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(blue);
  doc.text(L.totalTtc, totalsX, yTotals + 52, { width: 90, lineBreak: false });
  doc.text(`${inv.totalTtc} ${inv.currency}`, totalsX + 95, yTotals + 52, {
    width: 105,
    align: 'right',
    lineBreak: false,
  });
  let wordsY = yTotals + 88;
  if (hasAdvanceDeduction(inv)) {
    doc.fontSize(9).font('Helvetica').fillColor('#64748b');
    const label = inv.appliedDepositNumber
      ? L.advanceWithNumber(inv.appliedDepositNumber).replace(':', '')
      : L.advanceDeducted.replace(':', '');
    doc.text(label, totalsX, yTotals + 78, { width: 90, lineBreak: false });
    doc.text(`- ${inv.advanceDeduction} ${inv.currency}`, totalsX + 95, yTotals + 78, {
      width: 105,
      align: 'right',
      lineBreak: false,
    });
    doc.rect(totalsX - 8, yTotals + 100, 213, 28).fill(accent);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text(L.netToPay, totalsX, yTotals + 108, { width: 90, lineBreak: false });
    doc.text(`${inv.netToPay} ${inv.currency}`, totalsX + 95, yTotals + 108, {
      width: 105,
      align: 'right',
      lineBreak: false,
    });
    wordsY = yTotals + 144;
  }
  const afterWordsY = drawAmountInWordsBox(doc, inv, amountForWords(inv), inv.currency, wordsY, L);
  drawNoteBox(doc, inv.notes, afterWordsY + 6, L);
}

function drawTableHeaderMinimal(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  L: DocumentPdfLabels
): number {
  const w = doc.page.width - 2 * SIDE_MARGIN;
  doc.rect(SIDE_MARGIN, y, w, 24).fill('#2f2f2f');
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  doc.text(L.description, SIDE_MARGIN + 8, y + 8, { width: 255, lineBreak: false });
  doc.text(L.qty, 345, y + 8, { width: 40, align: 'right', lineBreak: false });
  doc.text(L.unitPriceShort, 405, y + 8, { width: 70, align: 'right', lineBreak: false });
  doc.text(L.amount, 492, y + 8, { width: 58, align: 'right', lineBreak: false });
  doc.font('Helvetica');
  return y + 24;
}

function drawLinesMinimal(
  doc: InstanceType<typeof PDFDocument>,
  lines: InvoicePdfInput['lines'],
  tableTopY: number,
  currency: string,
  showCurrency: boolean,
  L: DocumentPdfLabels
): number {
  let y = drawTableHeaderMinimal(doc, tableTopY, L);
  for (const l of lines) {
    if (y + 22 > contentMaxY(doc)) {
      doc.addPage();
      y = drawTableHeaderMinimal(doc, SIDE_MARGIN, L);
    }
    if (((y - tableTopY - 24) / 22) % 2 === 1) {
      doc.rect(SIDE_MARGIN, y - 4, doc.page.width - 2 * SIDE_MARGIN, 22).fill('#f7f7f7');
    }
    doc.fillColor('#525252').fontSize(9);
    doc.text(l.description, SIDE_MARGIN + 8, y + 2, { width: 255, lineBreak: false });
    doc.text(l.quantity, 345, y + 2, { width: 40, align: 'right', lineBreak: false });
    doc.text(moneyText(l.unitPriceHt, currency, showCurrency), 392, y + 2, {
      width: 83,
      align: 'right',
      lineBreak: false,
    });
    doc.text(moneyText(l.lineTotalTtc, currency, showCurrency), 482, y + 2, {
      width: 68,
      align: 'right',
      lineBreak: false,
    });
    doc
      .moveTo(SIDE_MARGIN, y + 18)
      .lineTo(doc.page.width - SIDE_MARGIN, y + 18)
      .stroke('#e5e5e5');
    y += 22;
  }
  return y;
}

function renderMinimal(doc: InstanceType<typeof PDFDocument>, inv: InvoicePdfInput): void {
  const L = getDocumentPdfLabels(pdfLang(inv));
  const accent = docAccent(inv);
  const w = doc.page.width;
  const top = SIDE_MARGIN + 35;

  const hasLogo = drawOrgLogo(doc, inv.org.logoUrl, SIDE_MARGIN, top - 12, { fit: [190, 78] });
  if (!hasLogo) {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#2f2f2f')
      .text(inv.org.name.toUpperCase(), SIDE_MARGIN, top, { width: 260, lineBreak: false });
  }
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#8a8a8a')
    .text(inv.org.taxMatricule ? `${L.mf} ${inv.org.taxMatricule}` : '', SIDE_MARGIN, top + 28, {
      width: 240,
      lineBreak: false,
    });

  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#2f2f2f')
    .text(invoiceDocTitle(inv), SIDE_MARGIN, top - 8, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#8a8a8a')
    .text(`${L.numberPrefix} ${inv.number}`, SIDE_MARGIN, top + 25, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });

  doc
    .moveTo(SIDE_MARGIN, top + 72)
    .lineTo(w - SIDE_MARGIN, top + 72)
    .stroke('#2f2f2f');

  const infoY = top + 92;
  doc.fontSize(8).fillColor('#9a9a9a').font('Helvetica-Bold').text(L.billTo, SIDE_MARGIN, infoY);
  doc
    .fontSize(11)
    .fillColor('#333333')
    .text(inv.client.name, SIDE_MARGIN, infoY + 16, { width: 240, lineBreak: false });
  if (inv.client.taxId)
    doc
      .fontSize(9)
      .fillColor('#555555')
      .text(`${L.mf} ${inv.client.taxId}`, SIDE_MARGIN, infoY + 34);

  const metaX = w - SIDE_MARGIN - 210;
  const rowH = 20;
  const metaRows = [
    [L.date.toUpperCase(), formatDocumentDate(inv.issueDate, pdfLang(inv))],
    [L.currency, inv.currency],
  ];
  metaRows.forEach(([label, value], index) => {
    const y = infoY + index * rowH;
    doc.rect(metaX, y, 210, rowH).fill(index % 2 === 0 ? '#f2f2f2' : '#ffffff');
    doc
      .fontSize(8)
      .fillColor('#8a8a8a')
      .font('Helvetica')
      .text(label, metaX + 8, y + 6);
    doc
      .fontSize(8)
      .fillColor('#333333')
      .text(value, metaX + 90, y + 6, {
        width: 110,
        align: 'right',
        lineBreak: false,
      });
  });

  const afterTable = drawLinesMinimal(
    doc,
    inv.lines,
    infoY + 120,
    inv.currency,
    inv.showCurrencyOnLines ?? true,
    L
  );
  let yTotals = afterTable + 32;
  if (yTotals + 115 > contentMaxY(doc)) {
    doc.addPage();
    yTotals = SIDE_MARGIN + 32;
  }
  const totalsX = w - SIDE_MARGIN - 145;
  doc.fontSize(9).fillColor('#555555').font('Helvetica');
  doc.text(L.subtotalHt.replace(':', ''), totalsX, yTotals, { width: 58, lineBreak: false });
  doc.text(`${inv.subtotalHt} ${inv.currency}`, totalsX + 65, yTotals, {
    width: 80,
    align: 'right',
    lineBreak: false,
  });
  doc.text(L.vat, totalsX, yTotals + 26, { width: 58, lineBreak: false });
  doc.text(`${inv.vatTotal} ${inv.currency}`, totalsX + 65, yTotals + 26, {
    width: 80,
    align: 'right',
    lineBreak: false,
  });
  doc.rect(totalsX - 8, yTotals + 52, 153, 32).fill('#2f2f2f');
  doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text(L.totalTtc.replace(' ', '\n'), totalsX, yTotals + 58, { width: 55, lineBreak: false });
  doc.text(`${inv.totalTtc} ${inv.currency}`, totalsX + 55, yTotals + 62, {
    width: 82,
    align: 'right',
    lineBreak: false,
  });
  let wordsY = yTotals + 100;
  if (hasAdvanceDeduction(inv)) {
    doc.fontSize(9).font('Helvetica').fillColor('#555555');
    const label = inv.appliedDepositNumber
      ? L.advanceWithNumber(inv.appliedDepositNumber).replace(':', '')
      : L.advanceDeducted.replace(':', '');
    doc.text(label, totalsX, yTotals + 90, { width: 58, lineBreak: false });
    doc.text(`- ${inv.advanceDeduction}`, totalsX + 65, yTotals + 90, {
      width: 80,
      align: 'right',
      lineBreak: false,
    });
    doc.rect(totalsX - 8, yTotals + 112, 153, 32).fill(accent);
    doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold');
    doc.text(L.netToPay.replace(' ', '\n'), totalsX, yTotals + 118, {
      width: 55,
      lineBreak: false,
    });
    doc.text(`${inv.netToPay} ${inv.currency}`, totalsX + 55, yTotals + 122, {
      width: 82,
      align: 'right',
      lineBreak: false,
    });
    wordsY = yTotals + 160;
  }
  const afterWordsY = drawAmountInWordsBox(doc, inv, amountForWords(inv), inv.currency, wordsY, L);
  drawNoteBox(doc, inv.notes, afterWordsY + 6, L);
}

function renderInvoiceToDocument(doc: InstanceType<typeof PDFDocument>, inv: InvoicePdfInput) {
  switch (inv.template) {
    case 'MODERN':
      renderModern(doc, inv);
      break;
    case 'MINIMAL':
      renderMinimal(doc, inv);
      break;
    case 'MONO':
      renderMinimal(doc, inv);
      break;
    case 'BLUE_PRO':
      renderModern(doc, inv);
      break;
    default:
      renderClassic(doc, inv);
  }
  finalizeBufferedFooters(doc, invoiceFooterDisplay(inv));
}

/** Génère le PDF visuel (PDFKit) en buffer — base du Factur-X hybride. */
export function buildInvoicePdfBuffer(inv: InvoicePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      margin: SIDE_MARGIN,
      size: 'A4',
      bufferPages: true,
      autoFirstPage: true,
    });
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    renderInvoiceToDocument(doc, inv);
    doc.end();
  });
}

export function streamInvoicePdf(res: Response, inv: InvoicePdfInput) {
  const filename = `${inv.number.replace(/[^\w.-]/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({
    margin: SIDE_MARGIN,
    size: 'A4',
    bufferPages: true,
    autoFirstPage: true,
  });
  doc.pipe(res);
  renderInvoiceToDocument(doc, inv);
  doc.end();
}
