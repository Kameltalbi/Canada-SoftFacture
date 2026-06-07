import { SubscriptionClient } from '@/components/subscription/subscription-client';
import { getPublicBillingPlans } from '@/lib/billing-api';

export default async function SubscriptionPage() {
  const billing = await getPublicBillingPlans();

  return <SubscriptionClient initialBilling={billing} />;
}
