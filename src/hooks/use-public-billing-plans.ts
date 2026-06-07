'use client';

import { useEffect, useState } from 'react';
import {
  fetchBillingPlans,
  getStaticBillingPlans,
  planPricesHtFromBilling,
  type BillingPlansResponse,
} from '@/lib/billing-api';

export function usePublicBillingPlans(initial?: BillingPlansResponse) {
  const [billing, setBilling] = useState<BillingPlansResponse>(initial ?? getStaticBillingPlans());
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let cancelled = false;

    void fetchBillingPlans()
      .then((data) => {
        if (!cancelled) setBilling(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    billing,
    planPrices: planPricesHtFromBilling(billing),
    loading,
    trialDays: billing.trialDays,
    vatRatePercent: billing.vatRatePercent,
  };
}
