import { MarketingShell } from '@/components/marketing/marketing-shell';
import { PricingPageServer } from '@/components/marketing/pricing-page-server';

export default function TarifsPage() {
  return (
    <MarketingShell activeNav="pricing">
      <PricingPageServer />
    </MarketingShell>
  );
}
