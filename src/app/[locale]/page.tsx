import { LandingHero } from '@/components/marketing/landing-hero';
import { LandingHeader } from '@/components/marketing/landing-header';
import {
  LandingAudienceSection,
  LandingBenefitsSection,
  LandingFaqSection,
  LandingFeaturesSection,
  LandingFinalCta,
  LandingFooter,
  LandingHowSection,
  LandingProblemSection,
} from '@/components/marketing/landing-sections';
import { PricingSection } from '@/components/marketing/pricing-section';
import { VisitorAssistant } from '@/components/marketing/visitor-assistant';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LandingHeader />
      <LandingHero />
      <LandingProblemSection />
      <LandingFeaturesSection />
      <LandingHowSection />
      <LandingAudienceSection />
      <LandingBenefitsSection />
      <PricingSection showComparison={false} />
      <LandingFaqSection />
      <LandingFinalCta />
      <LandingFooter />
      <VisitorAssistant />
    </div>
  );
}
