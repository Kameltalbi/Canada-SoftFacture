'use client';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlanId } from '@/lib/pricing-plans';

export function PricingPlanActions({
  planId,
  isCurrent,
  chooseLabel,
  currentLabel,
  highlighted,
}: {
  planId: PlanId;
  isCurrent: boolean;
  chooseLabel: string;
  currentLabel: string;
  highlighted?: boolean;
}) {
  if (isCurrent) {
    return (
      <Button variant="secondary" className="mt-6 w-full" disabled>
        {currentLabel}
      </Button>
    );
  }

  return (
    <Link href={`/checkout?plan=${planId}`} className="mt-6 block">
      <Button
        variant="primary"
        className={cn('w-full', highlighted && 'bg-emerald-600 hover:bg-emerald-700')}
      >
        {chooseLabel}
      </Button>
    </Link>
  );
}
