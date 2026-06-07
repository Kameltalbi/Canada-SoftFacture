'use client';

import { EinvoiceFeatureGate } from '@/components/einvoice/einvoice-feature-gate';

export default function ReceivedInvoicesPage() {
  return (
    <EinvoiceFeatureGate>
      <div />
    </EinvoiceFeatureGate>
  );
}
