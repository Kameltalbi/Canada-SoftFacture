/**
 * Crée le produit et les prix Stripe CAD pour SoftFacture Pro (mensuel + annuel).
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

const PLAN = {
  key: 'PRO',
  name: 'SoftFacture Canada Pro',
  monthly: 9.99,
  yearly: 99,
} as const;

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

  const products = await stripe.products.list({ limit: 100, active: true });
  const product =
    products.data.find((p) => p.metadata.softfacture_plan === PLAN.key) ??
    (await stripe.products.create({
      name: PLAN.name,
      metadata: { softfacture_plan: PLAN.key, currency: 'cad' },
    }));

  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    currency: 'cad',
    unit_amount: toCents(PLAN.monthly),
    recurring: { interval: 'month' },
    tax_behavior: 'exclusive',
    nickname: `${PLAN.key} monthly CAD`,
    metadata: { softfacture_plan: PLAN.key, interval: 'month' },
  });

  const yearlyPrice = await stripe.prices.create({
    product: product.id,
    currency: 'cad',
    unit_amount: toCents(PLAN.yearly),
    recurring: { interval: 'year' },
    tax_behavior: 'exclusive',
    nickname: `${PLAN.key} yearly CAD`,
    metadata: { softfacture_plan: PLAN.key, interval: 'year' },
  });

  console.log(`${PLAN.name}: product ${product.id}`);
  console.log(`  monthly $${PLAN.monthly} → ${monthlyPrice.id}`);
  console.log(`  yearly  $${PLAN.yearly} → ${yearlyPrice.id}`);
  console.log('\nAjouter dans backend/.env :\n');
  console.log(`STRIPE_PRICE_PRO=${monthlyPrice.id}`);
  console.log(`STRIPE_PRICE_PRO_YEARLY=${yearlyPrice.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
