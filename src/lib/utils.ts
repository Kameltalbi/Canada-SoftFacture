import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Conversion Prisma Decimal / string vers number pour l’UI */
export function toNumber(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return Number((v as { toNumber: () => number }).toNumber());
  }
  return Number(v);
}
