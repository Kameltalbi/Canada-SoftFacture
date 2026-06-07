import { Prisma } from '../generated/prisma/index.js';

/** Net à payer = TTC − acompte déjà facturé (plancher 0). */
export function computeNetToPay(
  totalTtc: Prisma.Decimal | number,
  advanceDeduction: Prisma.Decimal | number
): Prisma.Decimal {
  const ttc = totalTtc instanceof Prisma.Decimal ? totalTtc : new Prisma.Decimal(totalTtc);
  const adv =
    advanceDeduction instanceof Prisma.Decimal
      ? advanceDeduction
      : new Prisma.Decimal(advanceDeduction);
  const net = ttc.sub(adv);
  return net.lessThan(0)
    ? new Prisma.Decimal(0)
    : net.toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
}
