'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { FEATURES } from '@/lib/feature-flags';

/** Redirige si les fonctionnalités e-facture ne sont pas activées. */
export function EinvoiceFeatureGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!FEATURES.einvoiceUi) router.replace('/invoices');
  }, [router]);

  if (!FEATURES.einvoiceUi) return null;
  return children;
}
