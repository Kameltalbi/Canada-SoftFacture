import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/index.js';
import { prisma } from '../lib/db.js';
import { getOrganizationPlan, planHasStockInventory } from '../lib/planFeatures.js';
import { isStockableKind, stockableProductFilter } from '../lib/productKind.js';
import {
  productCanSetInitialStock,
  runInventoryCount,
  setInitialStockQuantity,
} from '../services/stockLedger.js';
import { organizationManagesStock } from '../lib/stockManagement.js';

const router = Router();
const orgId = (req: Express.Request) => req.user!.organizationId!;

router.use(async (req, res, next) => {
  try {
    if (!(await organizationManagesStock(orgId(req)))) {
      return res.status(403).json({
        error: 'La gestion de stock est désactivée pour votre organisation.',
        code: 'STOCK_DISABLED',
      });
    }
    next();
  } catch (err) {
    next(err);
  }
});

async function stockCapabilities(organizationId: string) {
  const plan = await getOrganizationPlan(organizationId);
  return {
    plan,
    canInventory: planHasStockInventory(plan),
  };
}

router.get('/', async (req, res) => {
  const oid = orgId(req);
  const products = await prisma.product.findMany({
    where: stockableProductFilter(oid),
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ name: 'asc' }],
  });

  const canSetInitialFlags = await Promise.all(
    products.map(async (p) => ({
      id: p.id,
      canSetInitial: await productCanSetInitialStock(p.id),
    }))
  );
  const initialMap = new Map(canSetInitialFlags.map((x) => [x.id, x.canSetInitial]));

  const alerts = products.filter((p) => {
    const threshold = p.stockAlertThreshold;
    if (threshold === null) return false;
    return p.stockQuantity.lessThanOrEqualTo(threshold);
  });

  const capabilities = await stockCapabilities(oid);

  return res.json({
    products: products.map((p) => ({
      ...p,
      canSetInitial: initialMap.get(p.id) ?? false,
    })),
    alertCount: alerts.length,
    capabilities,
  });
});

router.get('/movements', async (req, res) => {
  const productId = typeof req.query.productId === 'string' ? req.query.productId : undefined;
  const list = await prisma.stockMovement.findMany({
    where: {
      organizationId: orgId(req),
      product: { kind: 'PRODUCT' },
      ...(productId ? { productId } : {}),
    },
    include: {
      product: { select: { id: true, name: true } },
      invoice: { select: { id: true, number: true, kind: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 150,
  });
  return res.json(list);
});

const patchProductSchema = z.object({
  stockAlertThreshold: z.number().nonnegative().nullable(),
});

router.patch('/products/:id', async (req, res) => {
  const parsed = patchProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  const product = await prisma.product.findFirst({
    where: { id: req.params.id, organizationId: orgId(req) },
  });
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  if (!isStockableKind(product.kind)) {
    return res.status(400).json({ error: 'Les services ne sont pas gérés en stock' });
  }

  const threshold =
    parsed.data.stockAlertThreshold === null
      ? null
      : new Prisma.Decimal(parsed.data.stockAlertThreshold);

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { stockAlertThreshold: threshold },
    include: { category: { select: { id: true, name: true } } },
  });

  return res.json(updated);
});

const initialSchema = z.object({
  quantity: z.number().nonnegative(),
});

router.put('/products/:id/initial', async (req, res) => {
  const parsed = initialSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await setInitialStockQuantity(tx, {
        organizationId: orgId(req),
        productId: req.params.id,
        quantity: parsed.data.quantity,
      });
      return tx.product.findFirst({
        where: { id: req.params.id, organizationId: orgId(req) },
        include: { category: { select: { id: true, name: true } } },
      });
    });
    if (!updated) return res.status(404).json({ error: 'Produit introuvable' });
    return res.json(updated);
  } catch (e: unknown) {
    const code = e instanceof Error ? e.message : '';
    if (code === 'NOT_STOCKABLE') {
      return res.status(400).json({ error: 'Les services ne sont pas gérés en stock' });
    }
    if (code === 'STOCK_LOCKED') {
      return res.status(400).json({
        error:
          'Le stock initial ne peut plus être modifié après des mouvements liés aux factures ou à un inventaire',
      });
    }
    throw e;
  }
});

const inventorySchema = z.object({
  note: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        countedQuantity: z.number().nonnegative(),
      })
    )
    .min(1),
});

router.post('/inventory', async (req, res) => {
  const oid = orgId(req);
  const plan = await getOrganizationPlan(oid);
  if (!planHasStockInventory(plan)) {
    return res.status(403).json({
      error: 'L’inventaire physique est disponible avec l’offre Business',
      code: 'PLAN_INVENTORY',
    });
  }

  const parsed = inventorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Données invalides' });

  await prisma.$transaction(async (tx) => {
    await runInventoryCount(tx, {
      organizationId: oid,
      items: parsed.data.items,
      note: parsed.data.note ?? undefined,
    });
  });

  const products = await prisma.product.findMany({
    where: stockableProductFilter(oid),
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ name: 'asc' }],
  });

  return res.json({ ok: true, products });
});

export default router;
