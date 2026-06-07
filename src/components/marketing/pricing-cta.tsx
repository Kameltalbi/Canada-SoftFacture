'use client';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlanId } from '@/lib/pricing-plans';

export function PricingCta({
  label,
  highlighted,
  planId,
}: {
  label: string;
  highlighted: boolean;
  planId: PlanId;
}) {
  return (
    <Link href={`/checkout?plan=${planId}`} className="mt-6 block">
      <Button
        variant={highlighted ? 'primary' : 'secondary'}
        className={cn('w-full', highlighted && 'bg-emerald-600 hover:bg-emerald-700')}
      >
        {label}
      </Button>
    </Link>
  );
}
