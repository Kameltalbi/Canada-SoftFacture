import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/db.js';
import { normalizeStockFieldsForKind, PRODUCT_KIND, type ProductKind } from '../lib/productKind.js';
import { recordInitialStock } from '../services/stockLedger.js';
import { organizationManagesStock } from '../lib/stockManagement.js';

const router = Router();
const orgId = (req: Express.Request) => req.user!.organizationId!;

const kindSchema = z.enum([PRODUCT_KIND.PRODUCT, PRODUCT_KIND.SERVICE]);

const body = z.object({
  name: z.string().min(1),
  kind: kindSchema.optional(),
  description: z.string().optional().nullable(),
  unitPriceHt: z.number().nonnegative(),
  vatRate: z.number().min(0).max(100).optional(),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
  categoryId: z.string().nullable().optional(),
  stockQuantity: z.number().nonnegative().optional(),
  stockAlertThreshold: z.number().nonnegative().nullable().optional(),
});

function buildStockData(
  kind: ProductKind,
  stockQuantity?: number,
  stockAlertThreshold?: number | null
) {
  const stock = normalizeStockFieldsForKind(kind, { stockQuantity, stockAlertThreshold });
  return {
    stockQuantity: new Prisma.Decimal(stock.stockQuantity),
    stockAlertThreshold:
      stock.stockAlertThreshold === null ? null : new Prisma.Decimal(stock.stockAlertThreshold),
  };
}

async function resolveProductKind(
  organizationId: string,
  requested?: ProductKind
): Promise<{ kind: ProductKind; stockEnabled: boolean } | { error: string; code: string }> {
  const stockEnabled = await organizationManagesStock(organizationId);
  const defaultKind = stockEnabled ? PRODUCT_KIND.PRODUCT : PRODUCT_KIND.SERVICE;
  const kind = requested ?? defaultKind;
  if (!stockEnabled && kind === PRODUCT_KIND.PRODUCT) {
    return {
      error:
        'La gestion de stock est désactivée. Créez une prestation (service) ou activez le stock dans les paramètres.',
      code: 'STOCK_DISABLED',
    };
  }
  return { kind, stockEnabled };
}

router.get('/', async (req, res) => {
  const activeOnly = req.query.active === '1' || req.query.active === 'true';
  const products = await prisma.product.findMany({
    where: {
      organizationId: orgId(req),
      ...(activeOnly ? { isActive: true } : {}),
    },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  return res.json(products);
});

const importRowSchema = z.object({
  name: z.string().min(1),
  kind: kindSchema.optional(),
  description: z.string().nullable().optional(),
  unitPriceHt: z.number().nonnegative(),
  vatRate: z.number().min(0).max(100).optional(),
  unit: z.string().optional(),
  categoryName: z.string().nullable().optional(),
  stockQuantity: z.number().nonnegative().optional(),
  stockAlertThreshold: z.number().nonnegative().nullable().optional(),
});

const importBody = z.object({
  rows: z.array(importRowSchema).min(1).max(500),
  createMissingCategories: z.boolean().optional(),
});

function normalizeCategoryKey(name: string): string {
  return name.trim().toLowerCase();
}

router.post('/import', async (req, res) => {
  const parsed = importBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() });
  }

  const organizationId = orgId(req);
  const createMissingCategories = parsed.data.createMissingCategories ?? true;
  let created = 0;
  let skipped = 0;
  let categoriesCreated = 0;
  const errors: { line: number; message: string }[] = [];

  const existingCategories = await prisma.productCategory.findMany({
    where: { organizationId },
    select: { id: true, name: true },
  });
  const categoryByKey = new Map(
    existingCategories.map((c) => [normalizeCategoryKey(c.name), c.id])
  );

  for (let i = 0; i < parsed.data.rows.length; i += 1) {
    const row = parsed.data.rows[i];
    const line = i + 1;

    try {
      let categoryId: string | null = null;
      const categoryName = row.categoryName?.trim();
      if (categoryName) {
        const key = normalizeCategoryKey(categoryName);
        let id = categoryByKey.get(key);
        if (!id && createMissingCategories) {
          const cat = await prisma.productCategory.create({
            data: { organizationId, name: categoryName },
          });
          id = cat.id;
          categoryByKey.set(key, id);
          categoriesCreated += 1;
        }
        categoryId = id ?? null;
      }

      const kindResult = await resolveProductKind(organizationId, row.kind);
      if ('error' in kindResult) {
        skipped += 1;
        errors.push({ line, message: kindResult.error });
        continue;
      }
      const { kind } = kindResult;
      const stock = buildStockData(kind, row.stockQuantity, row.stockAlertThreshold);
      const initialQty = stock.stockQuantity;

      await prisma.$transaction(async (tx) => {
        const createdProduct = await tx.product.create({
          data: {
            organizationId,
            kind,
            name: row.name.trim(),
            description: row.description?.trim() || null,
            unitPriceHt: new Prisma.Decimal(row.unitPriceHt),
            vatRate: new Prisma.Decimal(row.vatRate ?? 20),
            unit: row.unit?.trim() || (kind === PRODUCT_KIND.SERVICE ? 'forfait' : 'unité'),
            isActive: true,
            categoryId,
            stockQuantity: new Prisma.Decimal(0),
            stockAlertThreshold: stock.stockAlertThreshold,
          },
        });

        if (kind === PRODUCT_KIND.PRODUCT && initialQty.greaterThan(0)) {
          await recordInitialStock(tx, {
            organizationId,
            productId: createdProduct.id,
            quantity: initialQty,
          });
        }
      });

      created += 1;
    } catch {
      skipped += 1;
      errors.push({ line, message: 'Impossible de créer ce produit' });
    }
  }

  return res.json({ created, skipped, categoriesCreated, errors });
});

router.post('/', async (req, res) => {
  const parsed = body.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const organizationId = orgId(req);
  if (parsed.data.categoryId) {
    const cat = await prisma.productCategory.findFirst({
      where: { id: parsed.data.categoryId, organizationId },
    });
    if (!cat) return res.status(400).json({ error: 'Catégorie invalide' });
  }
  const kindResult = await resolveProductKind(organizationId, parsed.data.kind);
  if ('error' in kindResult) {
    return res.status(400).json({ error: kindResult.error, code: kindResult.code });
  }
  const { kind } = kindResult;
  const stock = buildStockData(kind, parsed.data.stockQuantity, parsed.data.stockAlertThreshold);
  const initialQty = stock.stockQuantity;

  const p = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        organizationId: orgId(req),
        kind,
        name: parsed.data.name,
        description: parsed.data.description,
        unitPriceHt: new Prisma.Decimal(parsed.data.unitPriceHt),
        vatRate: new Prisma.Decimal(parsed.data.vatRate ?? 19),
        unit: parsed.data.unit ?? (kind === PRODUCT_KIND.SERVICE ? 'forfait' : 'unité'),
        isActive: parsed.data.isActive ?? true,
        categoryId: parsed.data.categoryId ?? null,
        stockQuantity: new Prisma.Decimal(0),
        stockAlertThreshold: stock.stockAlertThreshold,
      },
      include: { category: { select: { id: true, name: true } } },
    });

    if (kind === PRODUCT_KIND.PRODUCT && initialQty.greaterThan(0)) {
      await recordInitialStock(tx, {
        organizationId: orgId(req),
        productId: created.id,
        quantity: initialQty,
      });
    }

    return tx.product.findFirst({
      where: { id: created.id },
      include: { category: { select: { id: true, name: true } } },
    });
  });

  return res.status(201).json(p);
});

router.patch('/:id', async (req, res) => {
  const parsed = body.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });
  const id = req.params.id;
  const existing = await prisma.product.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  if (parsed.data.categoryId) {
    const cat = await prisma.productCategory.findFirst({
      where: { id: parsed.data.categoryId, organizationId: orgId(req) },
    });
    if (!cat) return res.status(400).json({ error: 'Catégorie invalide' });
  }

  const kind = parsed.data.kind ?? existing.kind;
  if (parsed.data.kind === PRODUCT_KIND.PRODUCT) {
    const stockEnabled = await organizationManagesStock(orgId(req));
    if (!stockEnabled) {
      return res.status(400).json({
        error: 'La gestion de stock est désactivée pour votre organisation.',
        code: 'STOCK_DISABLED',
      });
    }
  }
  const {
    unitPriceHt,
    vatRate,
    stockQuantity: _sq,
    stockAlertThreshold,
    kind: _k,
    ...rest
  } = parsed.data;

  const alertOnly = buildStockData(
    kind,
    Number(existing.stockQuantity),
    stockAlertThreshold !== undefined
      ? stockAlertThreshold
      : existing.stockAlertThreshold
        ? Number(existing.stockAlertThreshold)
        : null
  );

  const p = await prisma.product.update({
    where: { id },
    data: {
      ...rest,
      kind,
      ...(unitPriceHt !== undefined ? { unitPriceHt: new Prisma.Decimal(unitPriceHt) } : {}),
      ...(vatRate !== undefined ? { vatRate: new Prisma.Decimal(vatRate) } : {}),
      stockAlertThreshold: alertOnly.stockAlertThreshold,
      ...(kind === PRODUCT_KIND.SERVICE ? { stockQuantity: new Prisma.Decimal(0) } : {}),
    },
    include: { category: { select: { id: true, name: true } } },
  });
  return res.json(p);
});

router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  const existing = await prisma.product.findFirst({
    where: { id, organizationId: orgId(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  await prisma.product.delete({ where: { id } });
  return res.status(204).send();
});

export default router;
