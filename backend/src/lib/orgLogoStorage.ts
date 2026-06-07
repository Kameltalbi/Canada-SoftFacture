import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.join(__dirname, '../../uploads');
export const orgLogosDir = path.join(uploadsRoot, 'logos');

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

export function logoExtension(mime: string): string | null {
  return EXT_BY_MIME[mime.toLowerCase()] ?? null;
}

/** Chemin public servi par Express (/api/uploads/...). */
export function orgLogoPublicPath(organizationId: string, ext: string): string {
  return `/uploads/logos/${organizationId}${ext}`;
}

export async function ensureOrgLogosDir(): Promise<void> {
  await fs.mkdir(orgLogosDir, { recursive: true });
}

export async function deleteOrgLogoFiles(organizationId: string): Promise<void> {
  await ensureOrgLogosDir();
  const entries = await fs.readdir(orgLogosDir);
  await Promise.all(
    entries
      .filter((name) => name.startsWith(`${organizationId}.`))
      .map((name) => fs.unlink(path.join(orgLogosDir, name)).catch(() => undefined))
  );
}

export async function saveOrgLogoFile(
  organizationId: string,
  buffer: Buffer,
  mime: string
): Promise<string> {
  const ext = logoExtension(mime);
  if (!ext) {
    throw new Error('UNSUPPORTED_LOGO_TYPE');
  }
  await ensureOrgLogosDir();
  await deleteOrgLogoFiles(organizationId);
  const filePath = path.join(orgLogosDir, `${organizationId}${ext}`);
  await fs.writeFile(filePath, buffer);
  return orgLogoPublicPath(organizationId, ext);
}

/** Résout logoUrl (fichier ou data URL) pour PDFKit. */
export function resolveLogoSource(logoUrl: string | null | undefined): string | null {
  if (!logoUrl?.trim()) return null;
  const value = logoUrl.trim();
  if (value.startsWith('data:')) return value;
  if (value.startsWith('/uploads/')) {
    return path.join(uploadsRoot, value.replace(/^\/uploads\//, ''));
  }
  if (value.startsWith('/api/uploads/')) {
    return path.join(uploadsRoot, value.replace(/^\/api\/uploads\//, ''));
  }
  return value;
}
