import PDFDocument from 'pdfkit';
import type { Response } from 'express';
import type { PdfDocumentTemplate } from '../generated/prisma/index.js';
import { tableHeaderColor } from '../lib/pdfTheme.js';
import { SIDE_MARGIN, finalizeBufferedFooters, contentMaxY } from './pdfLayout.js';
import { drawOrgLogo } from '../lib/pdfLogo.js';

export type OtherDocumentPdfInput = {
  title: string;
  template: PdfDocumentTemplate;
  accentColor?: string;
  footerText?: string | null;
  defaultFooterLine: string;
  generatedAt: Date;
  org: {
    name: string;
    logoUrl: string | null;
    taxMatricule: string | null;
    address: string | null;
    city: string | null;
  };
};

function footerLine(input: OtherDocumentPdfInput): string {
  return input.footerText && input.footerText.trim().length > 0
    ? input.footerText.trim()
    : input.defaultFooterLine;
}

function docAccent(input: OtherDocumentPdfInput): string {
  return input.accentColor ?? '#0f766e';
}

const SAMPLE_LINES = [
  ['Prestation de service', '1', '800,00 €'],
  ['Développement / conseil', '1', '1 200,00 €'],
  ['Support et formation', '2', '400,00 €'],
];

function drawSampleClientBlock(doc: InstanceType<typeof PDFDocument>, x: number, y: number): void {
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text('DESTINATAIRE', x, y);
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text('Client / Société', x, y + 16, {
      width: 200,
      lineBreak: false,
    });
  doc
    .fontSize(8)
    .font('Helvetica')
    .fillColor('#64748b')
    .text('Adresse client', x, y + 32);
  doc.text('client@email.com', x, y + 44);
}

function drawSampleTable(
  doc: InstanceType<typeof PDFDocument>,
  y: number,
  options: { headerColor: string; totalColor: string; minimal?: boolean }
): number {
  const w = doc.page.width - 2 * SIDE_MARGIN;
  doc.rect(SIDE_MARGIN, y, w, 24).fill(options.headerColor);
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text(options.minimal ? 'DESCRIPTION' : 'PRESTATION', SIDE_MARGIN + 8, y + 8, {
    width: 260,
    lineBreak: false,
  });
  doc.text('QTÉ', 350, y + 8, { width: 40, align: 'right', lineBreak: false });
  doc.text('TOTAL', 475, y + 8, { width: 75, align: 'right', lineBreak: false });

  let rowY = y + 30;
  SAMPLE_LINES.forEach((line, index) => {
    if (options.minimal && index % 2 === 1) {
      doc.rect(SIDE_MARGIN, rowY - 4, w, 22).fill('#f7f7f7');
    }
    doc.fontSize(9).font('Helvetica').fillColor('#334155');
    doc.text(line[0], SIDE_MARGIN + 8, rowY, { width: 260, lineBreak: false });
    doc.text(line[1], 350, rowY, { width: 40, align: 'right', lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .text(line[2], 450, rowY, { width: 100, align: 'right', lineBreak: false });
    doc
      .moveTo(SIDE_MARGIN, rowY + 18)
      .lineTo(doc.page.width - SIDE_MARGIN, rowY + 18)
      .stroke('#e2e8f0');
    rowY += 28;
  });

  const totalsX = doc.page.width - SIDE_MARGIN - 175;
  doc.fontSize(9).font('Helvetica').fillColor('#64748b');
  doc.text('Sous-total HT', totalsX, rowY + 12, { width: 80, lineBreak: false });
  doc.text('2 400,00 €', totalsX + 80, rowY + 12, {
    width: 95,
    align: 'right',
    lineBreak: false,
  });
  doc.text('TVA', totalsX, rowY + 32, { width: 80, lineBreak: false });
  doc.text('480,00 €', totalsX + 80, rowY + 32, { width: 95, align: 'right', lineBreak: false });
  doc.rect(totalsX - 8, rowY + 54, 183, 28).fill(options.totalColor);
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor(options.minimal ? '#ffffff' : '#2563eb');
  doc.text('TOTAL TTC', totalsX, rowY + 62, { width: 85, lineBreak: false });
  doc.text('2 880,00 €', totalsX + 80, rowY + 62, {
    width: 90,
    align: 'right',
    lineBreak: false,
  });

  const noteY = rowY + 104;
  if (noteY + 40 < contentMaxY(doc)) {
    doc.roundedRect(SIDE_MARGIN, noteY, w, 36, 4).fill('#f8fafc').stroke('#e2e8f0');
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor('#475569')
      .text('Note', SIDE_MARGIN + 10, noteY + 8);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#334155')
      .text(
        'Exemple de note affichée uniquement si elle est renseignée.',
        SIDE_MARGIN + 10,
        noteY + 20,
        {
          width: w - 20,
          lineBreak: false,
        }
      );
  }

  return noteY + 44;
}

function renderClassic(doc: InstanceType<typeof PDFDocument>, input: OtherDocumentPdfInput): void {
  const accent = docAccent(input);
  const w = doc.page.width;
  const hasLogo = drawOrgLogo(doc, input.org.logoUrl, SIDE_MARGIN, SIDE_MARGIN - 10, {
    fit: [190, 78],
  });
  if (!hasLogo) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(accent)
      .text(input.org.name, SIDE_MARGIN, SIDE_MARGIN);
  }
  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor(accent)
    .text(input.title, SIDE_MARGIN, SIDE_MARGIN, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#64748b')
    .text(input.generatedAt.toLocaleDateString('fr-FR'), SIDE_MARGIN, SIDE_MARGIN + 34, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  const boxY = SIDE_MARGIN + 88;
  doc.rect(SIDE_MARGIN, boxY, 230, 78).stroke('#e2e8f0');
  doc.rect(SIDE_MARGIN, boxY, 230, 20).fill(accent);
  doc
    .fontSize(8)
    .font('Helvetica-Bold')
    .fillColor('#ffffff')
    .text('ÉMETTEUR', SIDE_MARGIN + 10, boxY + 6);
  doc
    .fontSize(10)
    .fillColor('#0f172a')
    .text(input.org.name, SIDE_MARGIN + 10, boxY + 30, { width: 200, lineBreak: false });
  doc.fontSize(8).font('Helvetica').fillColor('#64748b');
  if (input.org.address)
    doc.text(input.org.address, SIDE_MARGIN + 10, boxY + 45, { width: 200, lineBreak: false });
  if (input.org.city)
    doc.text(input.org.city, SIDE_MARGIN + 10, boxY + 57, { width: 200, lineBreak: false });
  drawSampleClientBlock(doc, SIDE_MARGIN + 270, boxY + 10);
  drawSampleTable(doc, boxY + 110, { headerColor: accent, totalColor: '#ecfdf5' });
}

function renderModern(doc: InstanceType<typeof PDFDocument>, input: OtherDocumentPdfInput): void {
  const accent = docAccent(input);
  const w = doc.page.width;
  const top = SIDE_MARGIN + 28;
  const blue = accent;
  const hasLogo = drawOrgLogo(doc, input.org.logoUrl, SIDE_MARGIN, top - 10, { fit: [190, 70] });
  if (!hasLogo)
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(blue)
      .text(input.org.name.toUpperCase(), SIDE_MARGIN, top);
  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#0f172a')
    .text(input.title, SIDE_MARGIN, top - 8, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  const metaY = top + 70;
  doc
    .moveTo(SIDE_MARGIN, metaY)
    .lineTo(w - SIDE_MARGIN, metaY)
    .stroke(blue);
  doc.rect(SIDE_MARGIN, metaY + 1, w - 2 * SIDE_MARGIN, 40).fill('#dbeafe');
  [
    ['DATE', input.generatedAt.toLocaleDateString('fr-FR')],
    ['TYPE', 'APERÇU'],
    ['STATUT', 'BROUILLON'],
  ].forEach(([label, value], i) => {
    const x = SIDE_MARGIN + 12 + i * 170;
    doc
      .fontSize(7)
      .font('Helvetica-Bold')
      .fillColor(blue)
      .text(label, x, metaY + 12);
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
    .text('DE', SIDE_MARGIN + 12, partyY + 8);
  doc
    .fontSize(10)
    .fillColor('#1f2937')
    .text(input.org.name, SIDE_MARGIN + 12, partyY + 24, { width: 210, lineBreak: false });
  if (input.org.address)
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#64748b')
      .text(input.org.address, SIDE_MARGIN + 12, partyY + 39);
  drawSampleClientBlock(doc, SIDE_MARGIN + 300, partyY + 8);
  drawSampleTable(doc, partyY + 96, {
    headerColor: tableHeaderColor('MODERN', accent),
    totalColor: '#dbeafe',
  });
}

function renderMinimal(doc: InstanceType<typeof PDFDocument>, input: OtherDocumentPdfInput): void {
  const w = doc.page.width;
  const top = SIDE_MARGIN + 35;
  const hasLogo = drawOrgLogo(doc, input.org.logoUrl, SIDE_MARGIN, top - 12, { fit: [190, 78] });
  if (!hasLogo)
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#2f2f2f')
      .text(input.org.name.toUpperCase(), SIDE_MARGIN, top);
  doc
    .fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#2f2f2f')
    .text(input.title, SIDE_MARGIN, top - 8, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#8a8a8a')
    .text(input.generatedAt.toLocaleDateString('fr-FR'), SIDE_MARGIN, top + 25, {
      width: w - 2 * SIDE_MARGIN,
      align: 'right',
      lineBreak: false,
    });
  doc
    .moveTo(SIDE_MARGIN, top + 72)
    .lineTo(w - SIDE_MARGIN, top + 72)
    .stroke('#2f2f2f');
  const infoY = top + 92;
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#9a9a9a').text('ÉMETTEUR', SIDE_MARGIN, infoY);
  doc
    .fontSize(11)
    .fillColor('#333333')
    .text(input.org.name, SIDE_MARGIN, infoY + 16, { width: 240, lineBreak: false });
  if (input.org.address)
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text(input.org.address, SIDE_MARGIN, infoY + 34);
  drawSampleClientBlock(doc, w - SIDE_MARGIN - 220, infoY);
  drawSampleTable(doc, infoY + 115, {
    headerColor: '#2f2f2f',
    totalColor: '#2f2f2f',
    minimal: true,
  });
}

export function streamOtherDocumentPdf(res: Response, input: OtherDocumentPdfInput) {
  const filename = 'document.pdf';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: SIDE_MARGIN, size: 'A4', bufferPages: true });
  doc.pipe(res);

  switch (input.template) {
    case 'MODERN':
      renderModern(doc, input);
      break;
    case 'MINIMAL':
    case 'MONO':
      renderMinimal(doc, input);
      break;
    case 'BLUE_PRO':
      renderModern(doc, input);
      break;
    default:
      renderClassic(doc, input);
  }

  finalizeBufferedFooters(doc, footerLine(input));
  doc.end();
}
