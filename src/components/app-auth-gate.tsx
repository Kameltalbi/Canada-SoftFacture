'use client';

import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { AppOnboardingGate } from '@/components/onboarding/app-onboarding-gate';

const SUPERADMIN_BLOCKED_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/quotes',
  '/clients',
  '/products',
  '/settings',
];

function isBlockedForSuperadmin(pathname: string) {
  return SUPERADMIN_BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AppAuthGate({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated' && pathname !== '/login') {
      router.replace('/login');
    }
  }, [status, pathname, router]);

  useEffect(() => {
    if (status !== 'authenticated' || !user) return;
    if (user.role === 'SUPERADMIN' && isBlockedForSuperadmin(pathname)) {
      router.replace('/admin');
    }
  }, [status, user, pathname, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-s-muted">…</div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
      }}
    >
      <AppOnboardingGate>{children}</AppOnboardingGate>
    </AppShell>
  );
}
