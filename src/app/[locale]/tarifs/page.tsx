import { MarketingShell } from '@/components/marketing/marketing-shell';
import { PricingSection } from '@/components/marketing/pricing-section';

export default function TarifsPage() {
  return (
    <MarketingShell activeNav="pricing">
      <PricingSection
        className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-emerald-50/80 to-white pt-8 md:pt-10"
        showComparison={false}
      />
    </MarketingShell>
  );
}
