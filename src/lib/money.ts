import { Prisma } from '@/generated/prisma';

type Decimal = InstanceType<typeof Prisma.Decimal>;

export function d(n: number | string): Decimal {
  return new Prisma.Decimal(n);
}

export function roundMoney3(n: Decimal): Decimal {
  return n.toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP);
}

export function calcLine(quantity: number, unitPriceHt: number, taxRatePercent: number) {
  const q = d(quantity);
  const p = d(unitPriceHt);
  const rate = d(taxRatePercent).div(100);
  const lineTotalHt = roundMoney3(q.mul(p));
  const lineVat = roundMoney3(lineTotalHt.mul(rate));
  const lineTotalTtc = roundMoney3(lineTotalHt.add(lineVat));
  return { lineTotalHt, lineVat, lineTotalTtc };
}

export function sumDecimals(values: Decimal[]) {
  return values.reduce((a, b) => a.add(b), new Prisma.Decimal(0));
}
