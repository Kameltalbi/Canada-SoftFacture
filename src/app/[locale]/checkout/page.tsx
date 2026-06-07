import { MarketingShell } from '@/components/marketing/marketing-shell';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { getPublicBillingPlans } from '@/lib/billing-api';
import { HIGHLIGHTED_PLAN_ID, isPlanId } from '@/lib/pricing-plans';

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  const plan = isPlanId(params.plan) ? params.plan : HIGHLIGHTED_PLAN_ID;
  const billing = await getPublicBillingPlans();

  return (
    <MarketingShell activeNav="pricing">
      <div className="py-10 md:py-14">
        <CheckoutForm initialPlan={plan} initialBilling={billing} />
      </div>
    </MarketingShell>
  );
}
