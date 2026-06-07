'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { confirmStripeCheckout } from '@/lib/billing-api';
import { useAuth } from '@/contexts/auth-context';

export function CheckoutSuccessClient() {
  const t = useTranslations('checkout');
  const searchParams = useSearchParams();
  const { status: authStatus } = useAuth();
  const mode = searchParams.get('mode');
  const stripeSessionId = searchParams.get('session_id');
  const isPendingMode = mode === 'pending';
  const [syncing, setSyncing] = useState(Boolean(stripeSessionId?.startsWith('cs_')));
  const [billingStatus, setBillingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isPendingMode || !stripeSessionId?.startsWith('cs_') || authStatus !== 'authenticated') {
      setSyncing(false);
      return;
    }
    void confirmStripeCheckout(stripeSessionId)
      .then((r) => setBillingStatus(r.billingStatus))
      .catch(() => {})
      .finally(() => setSyncing(false));
  }, [stripeSessionId, isPendingMode, authStatus]);

  const isTrial = billingStatus === 'TRIAL';

  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold text-s-navy">
        {syncing
          ? t('successSyncing')
          : isPendingMode
            ? t('successPendingTitle')
            : isTrial
              ? t('successTrialTitle')
              : t('successTitle')}
      </h1>
      <p className="mt-3 text-sm text-s-muted">
        {syncing
          ? t('successSyncingBody')
          : isPendingMode
            ? t('successPendingBody')
            : isTrial
              ? t('successTrialBody')
              : t('successBody')}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard">
          <Button variant="primary">{t('goDashboard')}</Button>
        </Link>
        <Link href="/subscription">
          <Button variant="secondary">{t('goSubscription')}</Button>
        </Link>
      </div>
    </Card>
  );
}
