/**
 * Crée les produits et prix Stripe CAD (Essentiel + Business, mensuel et annuel).
 *
 * Usage (depuis backend/) :
 *   npx tsx scripts/create-stripe-prices.ts
 *
 * Prérequis : STRIPE_SECRET_KEY dans backend/.env (clé test ou live).
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import Stripe from 'stripe';

config({ path: resolve(process.cwd(), '.env') });

const YEARLY_MONTHS_CHARGED = 10;
const PLANS = [
  { key: 'PRO', name: 'SoftFacture Canada Essentiel', monthly: 34.9 },
  { key: 'BUSINESS', name: 'SoftFacture Canada Business', monthly: 59.9 },
] as const;

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    console.error('STRIPE_SECRET_KEY manquant dans backend/.env');
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  const envLines: string[] = [];

  for (const plan of PLANS) {
    const products = await stripe.products.list({ limit: 100, active: true });
    const product =
      products.data.find((p) => p.metadata.softfacture_plan === plan.key) ??
      (await stripe.products.create({
        name: plan.name,
        metadata: { softfacture_plan: plan.key, currency: 'cad' },
      }));

    const yearly = Math.round(plan.monthly * YEARLY_MONTHS_CHARGED * 100) / 100;

    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      currency: 'cad',
      unit_amount: toCents(plan.monthly),
      recurring: { interval: 'month' },
      tax_behavior: 'exclusive',
      nickname: `${plan.key} monthly CAD`,
      metadata: { softfacture_plan: plan.key, interval: 'month' },
    });

    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      currency: 'cad',
      unit_amount: toCents(yearly),
      recurring: { interval: 'year' },
      tax_behavior: 'exclusive',
      nickname: `${plan.key} yearly CAD`,
      metadata: { softfacture_plan: plan.key, interval: 'year' },
    });

    envLines.push(`STRIPE_PRICE_${plan.key}=${monthlyPrice.id}`);
    envLines.push(`STRIPE_PRICE_${plan.key}_YEARLY=${yearlyPrice.id}`);
    console.log(`${plan.name}: product ${product.id}`);
    console.log(`  monthly $${plan.monthly} → ${monthlyPrice.id}`);
    console.log(`  yearly  $${yearly} → ${yearlyPrice.id}`);
  }

  console.log('\nAjouter dans backend/.env :\n');
  console.log(envLines.join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
