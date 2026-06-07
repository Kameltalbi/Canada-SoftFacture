import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { isPlanId } from '@/lib/pricing-plans';
import { XCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function CheckoutCancelPage({ searchParams }: Props) {
  const params = await searchParams;
  const t = await getTranslations('checkout');
  const plan = isPlanId(params.plan) ? params.plan : 'pro';

  return (
    <MarketingShell activeNav="pricing">
      <div className="py-16">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <XCircle className="mx-auto h-14 w-14 text-slate-400" aria-hidden />
          <h1 className="mt-4 text-2xl font-bold text-s-navy">{t('cancelTitle')}</h1>
          <p className="mt-3 text-sm text-s-muted">{t('cancelBody')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href={`/checkout?plan=${plan}`}>
              <Button variant="primary">{t('retryCheckout')}</Button>
            </Link>
            <Link href="/tarifs">
              <Button variant="secondary">{t('backToPricing')}</Button>
            </Link>
          </div>
        </Card>
      </div>
    </MarketingShell>
  );
}
