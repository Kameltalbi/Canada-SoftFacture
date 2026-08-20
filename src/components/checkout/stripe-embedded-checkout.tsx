'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';

type Props = {
  publishableKey: string;
  clientSecret: string;
};

export function StripeEmbeddedCheckout({ publishableKey, clientSecret }: Props) {
  const [mounted, setMounted] = useState(false);
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-[480px] animate-pulse rounded-xl bg-slate-50" aria-hidden />;
  }

  return (
    <div className="min-h-[480px]">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
