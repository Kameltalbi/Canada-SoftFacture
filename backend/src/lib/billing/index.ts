import { StripeBillingProvider } from './stripeProvider.js';
import type { BillingProviderAdapter } from './types.js';

let provider: BillingProviderAdapter | null = null;

export function getBillingProvider(): BillingProviderAdapter {
  if (!provider) {
    provider = new StripeBillingProvider();
  }
  return provider;
}

export * from './plans.js';
export * from './types.js';
export { isStripeEnabled } from './stripeClient.js';
