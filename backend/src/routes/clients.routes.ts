import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { isValidSiren, normalizeSiren } from '../lib/einvoice/siren.js';

const router = Router();

const orgId = (req: Express.Request) => req.user!.organizationId!;

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const clients = await prisma.client.findMany({
    where: {
      organizationId: orgId(req),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { taxId: { contains: q, mode: 'insensitive' } },
              { siren: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
  });
  return res.json(clients);
});

const clientBody = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  siren: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  /** Client professionnel (B2B) — déclenche mentions L441-10 sur les factures */
  isCompany: z.boolean().optional(),
});

function prepareClientFields(row: z.infer<typeof clientBody>):
  | { error: string }
  | {
      data: {
        name: string;
        email: string | null;
        phone: string | null;
        taxId: string | null;
        siren: string | null;
        address: string | null;
        postalCode: string | null;
        city: string | null;
        country: string;
        isCompany: boolean;
      };
    } {
  const explicitSiren = row.siren?.trim() ? normalizeSiren(row.siren) : null;
  if (row.siren?.trim() && !explicitSiren) {
    return { error: 'SIREN invalide (9 chiffres attendus)' };
  }
  const derivedSiren = explicitSiren ?? normalizeSiren(row.taxId);
  if (derivedSiren && !isValidSiren(derivedSiren)) {
    return { error: 'SIREN invalide (9 chiffres attendus)' };
  }

  return {
    data: {
      name: row.name.trim(),
      email: row.email?.trim() || null,
      phone: row.phone?.trim() || null,
      taxId: row.taxId?.trim() || null,
      siren: derivedSiren,
      address: row.address?.trim() || null,
      postalCode: row.postalCode?.trim() || null,
      city: row.city?.trim() || null,
      country: row.country?.trim()?.toUpperCase() || 'FR',
      isCompany: row.isCompany ?? false,
    },
  };
}

const importBody = z.object({
  rows: z.array(clientBody).min(1).max(500),
});

router.post('/import', async (req, res) => {
  const parsed = importBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const organizationId = orgId(req);
  let created = 0;
  let skipped = 0;
  const errors: { line: number; message: string }[] = [];

  for (let i = 0; i < parsed.data.rows.length; i += 1) {
    const row = parsed.data.rows[i];
    const line = i + 1;
    try {
      const prepared = prepareClientFields(row);
      if ('error' in prepared) {
        skipped += 1;
        errors.push({ line, message: prepared.error });
        continue;
      }
      await prisma.client.create({
        data: { organizationId, ...prepared.data },
      });
      created += 1;
    } catch {
      skipped += 1;
      errors.push({ line, message: 'Impossible de créer ce client' });
    }
  }

  return res.json({ created, skipped, errors });
});

router.post('/', async (req, res) => {
  const parsed = clientBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const prepared = prepareClientFields(parsed.data);
  if ('error' in prepared) return res.status(400).json({ error: prepared.error });
  const c = await prisma.client.create({
    data: {
      organizationId: orgId(req),
      ...prepared.data,
    },
  });
  return res.status(201).json(c);
});

router.patch('/:id', async (req, res) => {
  const parsed = clientBody.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const id = req.params.id;
  const existing = await prisma.client.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });

  const merged = {
    name: parsed.data.name ?? existing.name,
    email: parsed.data.email !== undefined ? parsed.data.email : existing.email,
    phone: parsed.data.phone !== undefined ? parsed.data.phone : existing.phone,
    taxId: parsed.data.taxId !== undefined ? parsed.data.taxId : existing.taxId,
    siren: parsed.data.siren !== undefined ? parsed.data.siren : existing.siren,
    address: parsed.data.address !== undefined ? parsed.data.address : existing.address,
    postalCode: parsed.data.postalCode !== undefined ? parsed.data.postalCode : existing.postalCode,
    city: parsed.data.city !== undefined ? parsed.data.city : existing.city,
    country: parsed.data.country ?? existing.country,
    isCompany: parsed.data.isCompany !== undefined ? parsed.data.isCompany : existing.isCompany,
  };
  const prepared = prepareClientFields(merged);
  if ('error' in prepared) return res.status(400).json({ error: prepared.error });

  const c = await prisma.client.update({ where: { id }, data: prepared.data });
  return res.json(c);
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.client.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  await prisma.client.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
