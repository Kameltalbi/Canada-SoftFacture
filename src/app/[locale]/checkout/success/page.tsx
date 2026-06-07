import { Suspense } from 'react';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { CheckoutSuccessClient } from '@/components/checkout/checkout-success-client';

export default function CheckoutSuccessPage() {
  return (
    <MarketingShell activeNav="pricing">
      <div className="py-16">
        <Suspense fallback={<p className="text-center text-sm text-s-muted">…</p>}>
          <CheckoutSuccessClient />
        </Suspense>
      </div>
    </MarketingShell>
  );
}
