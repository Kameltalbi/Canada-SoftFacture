import { redirect } from 'next/navigation';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { getPublicBillingPlans } from '@/lib/billing-api';
import { HIGHLIGHTED_PLAN_ID, isFreePlan, isPlanId } from '@/lib/pricing-plans';

type Props = {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const params = await searchParams;
  const plan = isPlanId(params.plan) ? params.plan : HIGHLIGHTED_PLAN_ID;
  if (isFreePlan(plan)) {
    redirect('/register?plan=starter');
  }
  const cycle = params.cycle === 'yearly' ? 'yearly' : 'monthly';
  const billing = await getPublicBillingPlans();

  return (
    <MarketingShell activeNav="pricing">
      <div className="py-10 md:py-14">
        <CheckoutForm initialPlan={plan} initialCycle={cycle} initialBilling={billing} />
      </div>
    </MarketingShell>
  );
}
