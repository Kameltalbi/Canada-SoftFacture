import type PDFKit from 'pdfkit';

/** A4 lateral margin used across templates (matches previous PDFs). */
export const SIDE_MARGIN = 48;

/** Footer band height: 1.5 cm from physical bottom (72 pt/in, 25.4 mm/in). */
export const FOOTER_BAND_HEIGHT_PT = (72 / 25.4) * 15;

export function footerBandTop(doc: PDFKit.PDFDocument): number {
  return doc.page.height - FOOTER_BAND_HEIGHT_PT;
}

/** Max Y for flowing content so it does not enter the footer band. */
export function contentMaxY(doc: PDFKit.PDFDocument): number {
  return footerBandTop(doc) - 14;
}

const FOOTER_FONT_SIZE = 9;

export function finalizeBufferedFooters(doc: PDFKit.PDFDocument, footerText: string): void {
  const range = doc.bufferedPageRange();
  const pageWidth = doc.page.width;

  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const bandTop = footerBandTop(doc);
    doc
      .moveTo(SIDE_MARGIN, bandTop)
      .lineTo(pageWidth - SIDE_MARGIN, bandTop)
      .stroke('#cbd5e1');
    doc
      .fontSize(FOOTER_FONT_SIZE)
      .fillColor('#64748b')
      .text(footerText, SIDE_MARGIN, bandTop + 8, {
        width: pageWidth - 2 * SIDE_MARGIN,
        align: 'center',
        height: FOOTER_BAND_HEIGHT_PT - 12,
        lineBreak: false,
      });
  }
}
