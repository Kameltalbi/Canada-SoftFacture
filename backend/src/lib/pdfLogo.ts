import PDFDocument from 'pdfkit';
import { resolveLogoSource } from './orgLogoStorage.js';

export function drawOrgLogo(
  doc: InstanceType<typeof PDFDocument>,
  logoUrl: string | null,
  x: number,
  y: number,
  options: { fit: [number, number] }
): boolean {
  const src = resolveLogoSource(logoUrl);
  if (!src) return false;
  try {
    doc.image(src, x, y, options);
    return true;
  } catch {
    return false;
  }
}
