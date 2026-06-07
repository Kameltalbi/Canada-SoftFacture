import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { receivedInvoiceUpload } from '../lib/receivedInvoiceUpload.js';
import { deleteReceivedPdf, readReceivedPdf } from '../lib/einvoice/receivedInvoiceStorage.js';
import {
  ReceivedInvoiceImportError,
  importReceivedFacturXPdf,
} from '../services/receivedInvoiceImport.js';

const router = Router();
const orgId = (req: Express.Request) => req.user!.organizationId!;

const listInclude = {
  id: true,
  invoiceNumber: true,
  issueDate: true,
  dueDate: true,
  currency: true,
  supplierName: true,
  supplierSiren: true,
  totalTtc: true,
  status: true,
  source: true,
  buyerMismatch: true,
  receivedAt: true,
  facturXProfile: true,
} as const;

router.get('/', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const statusFilter = ['RECEIVED', 'ACCEPTED', 'DISPUTED', 'REFUSED', 'COLLECTED'] as const;
  const list = await prisma.receivedInvoice.findMany({
    where: {
      organizationId: orgId(req),
      ...(status && statusFilter.includes(status as (typeof statusFilter)[number])
        ? { status: status as (typeof statusFilter)[number] }
        : {}),
    },
    select: listInclude,
    orderBy: [{ receivedAt: 'desc' }],
  });
  return res.json(list);
});

router.post('/import', receivedInvoiceUpload.single('file'), async (req, res) => {
  if (!req.file?.buffer?.length) {
    return res.status(400).json({ error: 'Fichier PDF Factur-X requis (champ file)' });
  }

  try {
    const { row, buyerMismatch } = await importReceivedFacturXPdf({
      organizationId: orgId(req),
      pdfBuffer: req.file.buffer,
      source: 'UPLOAD',
    });

    return res.status(201).json({
      ...row,
      xmlContent: undefined,
      warning: buyerMismatch
        ? 'Le SIREN acheteur du fichier ne correspond pas à votre entreprise — vérifiez la facture.'
        : undefined,
    });
  } catch (e) {
    if (e instanceof ReceivedInvoiceImportError) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    if (e instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Fichier trop volumineux (max 15 Mo)' });
    }
    throw e;
  }
});

router.get('/:id', async (req, res) => {
  const row = await prisma.receivedInvoice.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
  });
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  return res.json(row);
});

router.get('/:id/pdf', async (req, res) => {
  const row = await prisma.receivedInvoice.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
    select: { pdfFilename: true, invoiceNumber: true, organizationId: true },
  });
  if (!row) return res.status(404).json({ error: 'Introuvable' });

  const buffer = await readReceivedPdf(row.organizationId, row.pdfFilename);
  const safeName = row.invoiceNumber.replace(/[^\w.-]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}-recu.pdf"`);
  return res.send(buffer);
});

router.get('/:id/xml', async (req, res) => {
  const row = await prisma.receivedInvoice.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
    select: { xmlContent: true, invoiceNumber: true },
  });
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  const safeName = row.invoiceNumber.replace(/[^\w.-]/g, '_');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}-recu.xml"`);
  return res.send(row.xmlContent);
});

const statusSchema = z.object({
  status: z.enum(['RECEIVED', 'ACCEPTED', 'DISPUTED', 'REFUSED', 'COLLECTED']),
  statusNote: z.string().max(2000).nullable().optional(),
});

router.patch('/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Statut invalide' });

  const existing = await prisma.receivedInvoice.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });

  const row = await prisma.receivedInvoice.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      statusNote: parsed.data.statusNote ?? existing.statusNote,
      statusUpdatedAt: new Date(),
    },
  });

  return res.json({ ...row, xmlContent: undefined });
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.receivedInvoice.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });

  await prisma.receivedInvoice.delete({ where: { id: existing.id } });
  await deleteReceivedPdf(existing.organizationId, existing.pdfFilename);
  return res.status(204).send();
});

export default router;
