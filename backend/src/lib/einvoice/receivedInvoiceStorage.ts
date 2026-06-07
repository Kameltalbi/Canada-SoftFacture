import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const receivedRoot = path.join(__dirname, '../../uploads/received');

export function receivedPdfPath(organizationId: string, filename: string): string {
  return path.join(receivedRoot, organizationId, filename);
}

export async function ensureReceivedDir(organizationId: string): Promise<string> {
  const dir = path.join(receivedRoot, organizationId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveReceivedPdf(
  organizationId: string,
  filename: string,
  buffer: Buffer
): Promise<void> {
  await ensureReceivedDir(organizationId);
  await fs.writeFile(receivedPdfPath(organizationId, filename), buffer);
}

export async function readReceivedPdf(organizationId: string, filename: string): Promise<Buffer> {
  return fs.readFile(receivedPdfPath(organizationId, filename));
}

export async function deleteReceivedPdf(organizationId: string, filename: string): Promise<void> {
  try {
    await fs.unlink(receivedPdfPath(organizationId, filename));
  } catch {
    /* fichier déjà absent */
  }
}
