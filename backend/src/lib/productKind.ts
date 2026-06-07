export const PRODUCT_KIND = {
  PRODUCT: 'PRODUCT',
  SERVICE: 'SERVICE',
} as const;

export type ProductKind = (typeof PRODUCT_KIND)[keyof typeof PRODUCT_KIND];

export function isStockableKind(kind: ProductKind): boolean {
  return kind === PRODUCT_KIND.PRODUCT;
}

/** Filtre Prisma : uniquement les articles stockables. */
export function stockableProductFilter(organizationId: string) {
  return {
    organizationId,
    isActive: true,
    kind: PRODUCT_KIND.PRODUCT,
  } as const;
}

export function normalizeStockFieldsForKind(
  kind: ProductKind,
  input: { stockQuantity?: number; stockAlertThreshold?: number | null }
): { stockQuantity: number; stockAlertThreshold: number | null } {
  if (!isStockableKind(kind)) {
    return { stockQuantity: 0, stockAlertThreshold: null };
  }
  return {
    stockQuantity: input.stockQuantity ?? 0,
    stockAlertThreshold: input.stockAlertThreshold ?? null,
  };
}
