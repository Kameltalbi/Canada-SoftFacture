'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

function isOnboardingComplete(user: NonNullable<ReturnType<typeof useAuth>['user']>) {
  return Boolean(user.organization?.onboardingCompletedAt);
}

export function AppOnboardingGate({ children }: { children: ReactNode }) {
  const t = useTranslations('onboarding');
  const { user } = useAuth();

  if (!user?.organizationId || user.role === 'SUPERADMIN') {
    return <>{children}</>;
  }

  if (isOnboardingComplete(user)) {
    return <>{children}</>;
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h2 className="text-lg font-semibold text-s-navy">{t('waitingTitle')}</h2>
        <p className="mt-2 max-w-md text-sm text-s-muted">{t('waitingBody')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="pointer-events-none select-none blur-[2px] opacity-60" aria-hidden>
        {children}
      </div>
      <OnboardingWizard />
    </>
  );
}
