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

export type QuotePdfInput = {
  number: string;
  documentLanguage?: DocumentLangCode;
  issueDate: Date;
  validUntil: Date | null;
  notes?: string | null;
  currency: string;
  applyVat?: boolean;
  applyFiscalStamp?: boolean;
  fiscalStamp?: string;
  discountEnabled?: boolean;
  discountRate?: string;
  showCurrencyOnLines?: boolean;
  template: PdfDocumentTemplate;
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

function quoteFooterDisplay(q: QuotePdfInput): string {
  return q.footerText && q.footerText.trim().length > 0 ? q.footerText.trim() : q.defaultFooterLine;
}

function pdfLang(q: QuotePdfInput): DocumentLangCode {
  return q.documentLanguage ?? 'fr';
}

function docAccent(q: QuotePdfInput): string {
  return q.accentColor ?? '#0f766e';
}

function moneyText(amount: string, currency: string, showCurrency = true): string {
  return showCurrency ? `${amount} ${currency}` : amount;
}

function drawAmountInWordsBox(
  doc: InstanceType<typeof PDFDocument>,
  q: QuotePdfInput,
  amount: string,
  currency: string,
  y: number,
  L: DocumentPdfLabels
): number {
  if (y + 28 > contentMaxY(doc)) return y;
  const width = doc.page.width - 2 * SIDE_MARGIN;
  doc.roundedRect(SIDE_MARGIN, y, width, 26, 3).fill('#f8fafc');
  const lang = pdfLang(q);
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

function drawMetaClassic(doc: InstanceType<typeof PDFDocument>, q: QuotePdfInput): void {
  const L = getDocumentPdfLabels(pdfLang(q));
  doc.fontSize(20).fillColor('#0f172a').text(L.quote, { continued: false });
  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .fillColor('#64748b')
    .text(`${L.numberPrefix} ${q.number} · ${formatDocumentDate(q.issueDate, pdfLang(q))}`);
  if (q.validUntil) {
    doc.text(`${L.validUntil}: ${formatDocumentDate(q.validUntil, pdfLang(q))}`, {
      continued: false,
    });
  }
  doc.moveDown(1.2);
}

function drawTableHeaderClassic(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  L: DocumentPdfLabels
): number {
  doc.fontSize(9).fillColor('#64748b');
  doc.text(L.description, COL.desc, y, { width: COL.descW });
  doc.text(L.qty, COL.qty, y, { width: COL.qtyW, align: 'right' });
  doc.text(L.unitPriceHtCol, COL.puh, y, { width: COL.puhW, align: 'right' });
  doc.text(L.vatPercentCol, COL.tvap, y, { width: COL.tvapW, align: 'right' });
  doc.text(L.lineTotalInclTax, COL.ttc, y, { width: COL.ttcW, align: 'right' });
  const lineY = y + 14;
  doc
    .moveTo(SIDE_MARGIN, lineY)
    .lineTo(doc.page.width - SIDE_MARGIN, lineY)
    .stroke('#e2e8f0');
  return lineY + 8;
}

function drawLinesClassic(
  doc: InstanceType<typeof PDFDocument>,
  lines: QuotePdfInput['lines'],
  tableTopY: number,
  L: DocumentPdfLabels
): number {
  let y = drawTableHeaderClassic(doc, tableTopY, L);
  doc.fillColor('#0f172a');
  for (const l of lines) {
    if (y + 22 > contentMaxY(doc)) {
      doc.addPage();
      y = drawTableHeaderClassic(doc, SIDE_MARGIN, L);
      doc.fillColor('#0f172a');
    }
    doc.fontSize(9).text(l.description, COL.desc, y, { width: COL.descW });
    doc.text(l.quantity, COL.qty, y, { width: COL.qtyW, align: 'right' });
    doc.text(l.unitPriceHt, COL.puh, y, { width: COL.puhW, align: 'right' });
    doc.text(l.taxRate, COL.tvap, y, { width: COL.tvapW, align: 'right' });
    doc.text(l.lineTotalTtc, COL.ttc, y, { width: COL.ttcW, align: 'right' });
    y += 22;
  }
  return y;
}

function renderClassic(doc: InstanceType<typeof PDFDocument>, q: QuotePdfInput): void {
  const L = getDocumentPdfLabels(pdfLang(q));
  const accent = docAccent(q);
  drawMetaClassic(doc, q);
  const hasLogo = drawOrgLogo(doc, q.org.logoUrl, SIDE_MARGIN, doc.y, { fit: [190, 78] });
  if (hasLogo) doc.moveDown(5);
  else doc.fontSize(10).fillColor('#0f172a').text(q.org.name, { continued: false });
  if (q.org.taxMatricule) doc.text(`${L.mf} : ${q.org.taxMatricule}`);
  if (q.org.address) doc.text(q.org.address);
  if (q.org.city) doc.text(q.org.city);
  doc.moveDown(0.8);
  doc.fontSize(10).text(L.clientLabel, { underline: true });
  doc.text(q.client.name);
  if (q.client.taxId) doc.text(`${L.mf} : ${q.client.taxId}`);
  doc.moveDown(1);

  const afterTable = drawLinesClassic(doc, q.lines, doc.y, L);
  let yTotals = afterTable + 24;
  if (yTotals + 80 > contentMaxY(doc)) {
    doc.addPage();
    yTotals = SIDE_MARGIN + 40;
  }
  doc.fontSize(10).fillColor('#0f172a');
  doc.text(`${L.subtotalHt} ${q.subtotalHt} ${q.currency}`, SIDE_MARGIN, yTotals, {
    align: 'right',
    width: doc.page.width - 2 * SIDE_MARGIN,
  });
  doc.text(`${L.vatLine} ${q.vatTotal} ${q.currency}`, SIDE_MARGIN, yTotals + 16, {
    align: 'right',
    width: doc.page.width - 2 * SIDE_MARGIN,
  });
  doc.fontSize(12).text(`${L.totalTtc} : ${q.totalTtc} ${q.currency}`, SIDE_MARGIN, yTotals + 32, {
    align: 'right',
    width: doc.page.width - 2 * SIDE_MARGIN,
  });
  const afterWordsY = drawAmountInWordsBox(doc, q, q.totalTtc, q.currency, yTotals + 58, L);
  drawNoteBox(doc, q.notes, afterWordsY + 6, L);
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
  lines: QuotePdfInput['lines'],
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

function renderModern(doc: InstanceType<typeof PDFDocument>, q: QuotePdfInput): void {
  const L = getDocumentPdfLabels(pdfLang(q));
  const accent = docAccent(q);
  const w = doc.page.width;
  const blue = accent;
  const lightBlue = '#dbeafe';
  const top = SIDE_MARGIN + 28;

  const hasLogo = drawOrgLogo(doc, q.org.logoUrl, SIDE_MARGIN, top - 10, { fit: [190, 70] });
  if (!hasLogo) {
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(blue)
      .text(q.org.name.toUpperCase(), SIDE_MARGIN, top, { width: 260, lineBreak: false });
  }
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#64748b')
    .text([q.org.address, q.org.city].filter(Boolean).join(', '), SIDE_MARGIN, top + 26, {
      width: 260,
      lineBreak: false,
    });

  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text(L.quote, SIDE_MARGIN, top - 8, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor(blue)
    .text(`${L.numberPrefix} ${q.number}`, SIDE_MARGIN, top + 25, {
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
    [L.issueDate, formatDocumentDate(q.issueDate, pdfLang(q))],
    [L.validUntil, q.validUntil ? formatDocumentDate(q.validUntil, pdfLang(q)) : '-'],
    [L.currency, q.currency],
  ];
  meta.forEach(([label, value], index) => {
    const x = SIDE_MARGIN + 12 + index * 128;
    doc
      .fontSize(7)
      .font('Helvetica-Bold')
      .fillColor(blue)
      .text(label, x, metaY + 12, { width: 110 });
    doc
      .fontSize(9)
      .fillColor('#1f2937')
      .text(value, x, metaY + 25, { width: 110, lineBreak: false });
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
    .text(q.org.name, SIDE_MARGIN + 12, partyY + 24, {
      width: 210,
      lineBreak: false,
    });
  doc.fontSize(8).fillColor('#64748b').font('Helvetica');
  if (q.org.address)
    doc.text(q.org.address, SIDE_MARGIN + 12, partyY + 39, { width: 210, lineBreak: false });
  if (q.org.taxMatricule)
    doc.text(`${L.mf} ${q.org.taxMatricule}`, SIDE_MARGIN + 12, partyY + 51, { width: 210 });

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
    .text(q.client.name, clientX + 12, partyY + 24, {
      width: 210,
      lineBreak: false,
    });
  if (q.client.taxId)
    doc
      .fontSize(8)
      .fillColor('#64748b')
      .text(`${L.mf} ${q.client.taxId}`, clientX + 12, partyY + 39);

  const afterTable = drawLinesModern(
    doc,
    q.lines,
    partyY + 96,
    q.currency,
    q.showCurrencyOnLines ?? true,
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
  doc.text(`${q.subtotalHt} ${q.currency}`, totalsX + 105, yTotals, {
    width: 100,
    align: 'right',
    lineBreak: false,
  });
  doc.text(L.vat, totalsX, yTotals + 22, { width: 92, lineBreak: false });
  doc.text(`${q.vatTotal} ${q.currency}`, totalsX + 105, yTotals + 22, {
    width: 100,
    align: 'right',
    lineBreak: false,
  });
  doc.rect(totalsX - 8, yTotals + 44, 213, 28).fill(lightBlue);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(blue);
  doc.text(L.totalTtc, totalsX, yTotals + 52, { width: 90, lineBreak: false });
  doc.text(`${q.totalTtc} ${q.currency}`, totalsX + 95, yTotals + 52, {
    width: 105,
    align: 'right',
    lineBreak: false,
  });
  const afterWordsY = drawAmountInWordsBox(doc, q, q.totalTtc, q.currency, yTotals + 88, L);
  drawNoteBox(doc, q.notes, afterWordsY + 6, L);
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
  lines: QuotePdfInput['lines'],
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

function renderMinimal(doc: InstanceType<typeof PDFDocument>, q: QuotePdfInput): void {
  const L = getDocumentPdfLabels(pdfLang(q));
  const w = doc.page.width;
  const top = SIDE_MARGIN + 35;

  const hasLogo = drawOrgLogo(doc, q.org.logoUrl, SIDE_MARGIN, top - 12, { fit: [190, 78] });
  if (!hasLogo) {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#2f2f2f')
      .text(q.org.name.toUpperCase(), SIDE_MARGIN, top, { width: 260, lineBreak: false });
  }
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#8a8a8a')
    .text(q.org.taxMatricule ? `${L.mf} ${q.org.taxMatricule}` : '', SIDE_MARGIN, top + 28, {
      width: 240,
      lineBreak: false,
    });

  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#2f2f2f')
    .text(L.quote, SIDE_MARGIN, top - 8, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#8a8a8a')
    .text(`${L.numberPrefix} ${q.number}`, SIDE_MARGIN, top + 25, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });

  doc
    .moveTo(SIDE_MARGIN, top + 72)
    .lineTo(w - SIDE_MARGIN, top + 72)
    .stroke('#2f2f2f');

  const infoY = top + 92;
  doc.fontSize(8).fillColor('#9a9a9a').font('Helvetica-Bold').text(L.quoteFor, SIDE_MARGIN, infoY);
  doc
    .fontSize(11)
    .fillColor('#333333')
    .text(q.client.name, SIDE_MARGIN, infoY + 16, { width: 240, lineBreak: false });
  if (q.client.taxId)
    doc
      .fontSize(9)
      .fillColor('#555555')
      .text(`${L.mf} ${q.client.taxId}`, SIDE_MARGIN, infoY + 34);

  const metaX = w - SIDE_MARGIN - 210;
  const rowH = 20;
  const metaRows = [
    [L.date.toUpperCase(), formatDocumentDate(q.issueDate, pdfLang(q))],
    [L.validUntil, q.validUntil ? formatDocumentDate(q.validUntil, pdfLang(q)) : '-'],
    [L.currency, q.currency],
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
    q.lines,
    infoY + 120,
    q.currency,
    q.showCurrencyOnLines ?? true,
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
  doc.text(`${q.subtotalHt} ${q.currency}`, totalsX + 65, yTotals, {
    width: 80,
    align: 'right',
    lineBreak: false,
  });
  doc.text(L.vat, totalsX, yTotals + 26, { width: 58, lineBreak: false });
  doc.text(`${q.vatTotal} ${q.currency}`, totalsX + 65, yTotals + 26, {
    width: 80,
    align: 'right',
    lineBreak: false,
  });
  doc.rect(totalsX - 8, yTotals + 52, 153, 32).fill('#2f2f2f');
  doc.fontSize(9).fillColor('#ffffff').font('Helvetica-Bold');
  doc.text(L.totalTtc.replace(' ', '\n'), totalsX, yTotals + 58, { width: 55, lineBreak: false });
  doc.text(`${q.totalTtc} ${q.currency}`, totalsX + 55, yTotals + 62, {
    width: 82,
    align: 'right',
    lineBreak: false,
  });
  const afterWordsY = drawAmountInWordsBox(doc, q, q.totalTtc, q.currency, yTotals + 100, L);
  drawNoteBox(doc, q.notes, afterWordsY + 6, L);
}

export function streamQuotePdf(res: Response, q: QuotePdfInput) {
  const safe = q.number.replace(/[^\w.-]/g, '_');
  const filename = `${safe}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: SIDE_MARGIN, size: 'A4', bufferPages: true });
  doc.pipe(res);

  switch (q.template) {
    case 'MODERN':
      renderModern(doc, q);
      break;
    case 'MINIMAL':
      renderMinimal(doc, q);
      break;
    case 'MONO':
      renderMinimal(doc, q);
      break;
    case 'BLUE_PRO':
      renderModern(doc, q);
      break;
    default:
      renderClassic(doc, q);
  }

  finalizeBufferedFooters(doc, quoteFooterDisplay(q));
  doc.end();
}
