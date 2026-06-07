import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';

const router = Router();
const orgId = (req: Express.Request) => req.user!.organizationId!;

router.get('/', async (req, res) => {
  const list = await prisma.productCategory.findMany({
    where: { organizationId: orgId(req) },
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return res.json(list);
});

const schema = z.object({
  name: z.string().min(1).max(80),
  sortOrder: z.number().int().optional(),
});

const importBody = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        sortOrder: z.number().int().optional(),
      })
    )
    .min(1)
    .max(500),
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
      await prisma.productCategory.create({
        data: {
          organizationId,
          name: row.name.trim(),
          sortOrder: row.sortOrder ?? 0,
        },
      });
      created += 1;
    } catch {
      skipped += 1;
      errors.push({ line, message: 'Catégorie déjà existante ou invalide' });
    }
  }

  return res.json({ created, skipped, errors });
});

router.post('/', async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  try {
    const cat = await prisma.productCategory.create({
      data: {
        organizationId: orgId(req),
        name: parsed.data.name.trim(),
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });
    return res.status(201).json(cat);
  } catch {
    return res.status(409).json({ error: 'Catégorie déjà existante' });
  }
});

router.patch('/:id', async (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const existing = await prisma.productCategory.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  const cat = await prisma.productCategory.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
    },
  });
  return res.json(cat);
});

router.delete('/:id', async (req, res) => {
  const existing = await prisma.productCategory.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  await prisma.product.updateMany({
    where: { categoryId: req.params.id, organizationId: orgId(req) },
    data: { categoryId: null },
  });
  await prisma.productCategory.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

export default router;
