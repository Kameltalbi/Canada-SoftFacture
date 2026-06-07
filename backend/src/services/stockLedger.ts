import { Prisma } from '../generated/prisma/index.js';
import type { Prisma as PrismaTypes } from '../generated/prisma/index.js';
import { prisma } from '../lib/db.js';
import { isStockableKind } from '../lib/productKind.js';

type StockMovementSource = 'INITIAL' | 'INVOICE' | 'CREDIT_NOTE' | 'INVENTORY' | 'CANCEL_REVERSAL';

export type StockShortageItem = {
  productId: string;
  name: string;
  requested: number;
  available: number;
};

export class InsufficientStockError extends Error {
  readonly code = 'INSUFFICIENT_STOCK' as const;

  constructor(public readonly items: StockShortageItem[]) {
    super('INSUFFICIENT_STOCK');
    this.name = 'InsufficientStockError';
  }
}

const DOCUMENT_SOURCES = ['INVOICE', 'CREDIT_NOTE'] as const;

type MovementInput = {
  organizationId: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  source: StockMovementSource;
  quantity: Prisma.Decimal;
  note?: string;
  invoiceId?: string;
  invoiceLineId?: string;
  targetQuantity?: Prisma.Decimal;
};

async function applyMovement(tx: PrismaTypes.TransactionClient, params: MovementInput) {
  const product = await tx.product.findFirst({
    where: { id: params.productId, organizationId: params.organizationId },
  });
  if (!product || !isStockableKind(product.kind)) return;

  let newQty = product.stockQuantity;
  let movementQty = params.quantity;

  if (params.type === 'IN') {
    newQty = newQty.add(params.quantity);
  } else if (params.type === 'OUT') {
    newQty = newQty.sub(params.quantity);
    if (newQty.lessThan(0)) {
      throw new InsufficientStockError([
        {
          productId: product.id,
          name: product.name,
          requested: Number(params.quantity),
          available: Number(product.stockQuantity),
        },
      ]);
    }
  } else if (params.type === 'ADJUSTMENT' && params.targetQuantity !== undefined) {
    movementQty = params.targetQuantity;
    newQty = params.targetQuantity;
  }

  await tx.stockMovement.create({
    data: {
      organizationId: params.organizationId,
      productId: params.productId,
      type: params.type,
      source: params.source,
      quantity: movementQty,
      note: params.note,
      invoiceId: params.invoiceId,
      invoiceLineId: params.invoiceLineId,
    },
  });

  await tx.product.update({
    where: { id: product.id },
    data: { stockQuantity: newQty },
  });
}

export async function recordInitialStock(
  tx: PrismaTypes.TransactionClient,
  params: {
    organizationId: string;
    productId: string;
    quantity: Prisma.Decimal;
    note?: string;
  }
) {
  if (params.quantity.lessThanOrEqualTo(0)) return;

  await applyMovement(tx, {
    organizationId: params.organizationId,
    productId: params.productId,
    type: 'IN',
    source: 'INITIAL',
    quantity: params.quantity,
    note: params.note ?? 'Stock initial',
  });
}

export async function setInitialStockQuantity(
  tx: PrismaTypes.TransactionClient,
  params: { organizationId: string; productId: string; quantity: number }
) {
  const product = await tx.product.findFirst({
    where: { id: params.productId, organizationId: params.organizationId },
  });
  if (!product || !isStockableKind(product.kind)) {
    throw new Error('NOT_STOCKABLE');
  }

  const locked = await tx.stockMovement.count({
    where: {
      productId: params.productId,
      source: { in: [...DOCUMENT_SOURCES, 'INVENTORY', 'CANCEL_REVERSAL'] },
    },
  });
  if (locked > 0) {
    throw new Error('STOCK_LOCKED');
  }

  const qty = new Prisma.Decimal(params.quantity);
  await tx.stockMovement.deleteMany({
    where: { productId: params.productId, source: 'INITIAL' },
  });
  await tx.product.update({
    where: { id: params.productId },
    data: { stockQuantity: new Prisma.Decimal(0) },
  });

  if (qty.greaterThan(0)) {
    await recordInitialStock(tx, {
      organizationId: params.organizationId,
      productId: params.productId,
      quantity: qty,
    });
  } else {
    await tx.product.update({
      where: { id: params.productId },
      data: { stockQuantity: qty },
    });
  }
}

export async function applyStockOnInvoiceValidation(
  tx: PrismaTypes.TransactionClient,
  params: { organizationId: string; invoiceId: string }
) {
  const already = await tx.stockMovement.count({
    where: {
      invoiceId: params.invoiceId,
      source: { in: [...DOCUMENT_SOURCES] },
    },
  });
  if (already > 0) return;

  const inv = await tx.invoice.findFirst({
    where: { id: params.invoiceId, organizationId: params.organizationId },
    include: {
      lines: {
        orderBy: { sortOrder: 'asc' },
        include: { product: true },
      },
    },
  });
  if (!inv) throw new Error('NOT_FOUND');

  const isCredit = inv.kind === 'CREDIT_NOTE';
  const isSale = inv.kind === 'STANDARD' || inv.kind === 'DEPOSIT';
  if (!isCredit && !isSale) return;

  const docLabel = inv.number ?? inv.id.slice(0, 8);
  const totals = new Map<
    string,
    { product: (typeof inv.lines)[0]['product']; quantity: Prisma.Decimal; lineId: string }
  >();

  for (const line of inv.lines) {
    if (!line.productId || !line.product || !isStockableKind(line.product.kind)) continue;
    const prev = totals.get(line.productId);
    if (prev) {
      prev.quantity = prev.quantity.add(line.quantity);
    } else {
      totals.set(line.productId, {
        product: line.product,
        quantity: line.quantity,
        lineId: line.id,
      });
    }
  }

  const shortages: StockShortageItem[] = [];
  if (isSale) {
    for (const [productId, entry] of totals) {
      if (entry.product!.stockQuantity.lessThan(entry.quantity)) {
        shortages.push({
          productId,
          name: entry.product!.name,
          requested: Number(entry.quantity),
          available: Number(entry.product!.stockQuantity),
        });
      }
    }
  }

  if (shortages.length > 0) {
    throw new InsufficientStockError(shortages);
  }

  for (const [productId, entry] of totals) {
    if (isSale) {
      await applyMovement(tx, {
        organizationId: params.organizationId,
        productId,
        type: 'OUT',
        source: 'INVOICE',
        quantity: entry.quantity,
        invoiceId: inv.id,
        invoiceLineId: entry.lineId,
        note: `Facture ${docLabel}`,
      });
    } else if (isCredit) {
      await applyMovement(tx, {
        organizationId: params.organizationId,
        productId,
        type: 'IN',
        source: 'CREDIT_NOTE',
        quantity: entry.quantity,
        invoiceId: inv.id,
        invoiceLineId: entry.lineId,
        note: `Avoir ${docLabel}`,
      });
    }
  }
}

export async function reverseStockOnInvoiceCancel(
  tx: PrismaTypes.TransactionClient,
  params: { organizationId: string; invoiceId: string }
) {
  const reversed = await tx.stockMovement.count({
    where: { invoiceId: params.invoiceId, source: 'CANCEL_REVERSAL' },
  });
  if (reversed > 0) return;

  const movements = await tx.stockMovement.findMany({
    where: {
      invoiceId: params.invoiceId,
      organizationId: params.organizationId,
      source: { in: [...DOCUMENT_SOURCES] },
    },
    include: { product: { select: { name: true } } },
  });
  if (movements.length === 0) return;

  const inv = await tx.invoice.findFirst({
    where: { id: params.invoiceId },
    select: { number: true },
  });
  const docLabel = inv?.number ?? params.invoiceId.slice(0, 8);

  for (const m of movements) {
    const reverseType = m.type === 'IN' ? 'OUT' : 'IN';
    await applyMovement(tx, {
      organizationId: params.organizationId,
      productId: m.productId,
      type: reverseType,
      source: 'CANCEL_REVERSAL',
      quantity: m.quantity,
      invoiceId: params.invoiceId,
      note: `Annulation ${docLabel} — ${m.product.name}`,
    });
  }
}

export async function runInventoryCount(
  tx: PrismaTypes.TransactionClient,
  params: {
    organizationId: string;
    items: { productId: string; countedQuantity: number }[];
    note?: string;
  }
) {
  for (const item of params.items) {
    const product = await tx.product.findFirst({
      where: { id: item.productId, organizationId: params.organizationId },
    });
    if (!product || !isStockableKind(product.kind)) continue;

    const target = new Prisma.Decimal(item.countedQuantity);
    if (target.equals(product.stockQuantity)) continue;

    await applyMovement(tx, {
      organizationId: params.organizationId,
      productId: product.id,
      type: 'ADJUSTMENT',
      source: 'INVENTORY',
      quantity: target,
      targetQuantity: target,
      note: params.note ?? 'Inventaire',
    });
  }
}

export async function productCanSetInitialStock(productId: string): Promise<boolean> {
  const locked = await prisma.stockMovement.count({
    where: {
      productId,
      source: { in: [...DOCUMENT_SOURCES, 'INVENTORY', 'CANCEL_REVERSAL'] },
    },
  });
  return locked === 0;
}
