'use client';

import { EinvoiceFeatureGate } from '@/components/einvoice/einvoice-feature-gate';

export default function ReceivedInvoiceDetailPage() {
  return (
    <EinvoiceFeatureGate>
      <div />
    </EinvoiceFeatureGate>
  );
}
