import { Prisma } from '../generated/prisma/index.js';

type D = InstanceType<typeof Prisma.Decimal>;

function d(n: number | string): D {
  return new Prisma.Decimal(n);
}

export function round3(n: D): D {
  return n.toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
}

export function calcLine(quantity: number, unitPriceHt: number, taxRatePercent: number) {
  const q = d(quantity);
  const p = d(unitPriceHt);
  const rate = d(taxRatePercent).div(100);
  const lineTotalHt = round3(q.mul(p));
  const lineVat = round3(lineTotalHt.mul(rate));
  const lineTotalTtc = round3(lineTotalHt.add(lineVat));
  return { lineTotalHt, lineVat, lineTotalTtc };
}
