'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, status } = useAuth();

  if (status === 'loading' || !user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-s-navy">{t('title')}</h1>
        <p className="text-s-muted">{t('subtitle')}</p>
      </div>
      <Card>
        <CardTitle className="mb-4">{t('title')}</CardTitle>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase text-s-muted">{t('email')}</dt>
            <dd className="mt-1 font-medium">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-s-muted">{t('role')}</dt>
            <dd className="mt-1 font-medium">{user.role}</dd>
          </div>
          {user.organization ? (
            <div>
              <dt className="text-xs font-medium uppercase text-s-muted">Organisation</dt>
              <dd className="mt-1 font-medium">{user.organization.name}</dd>
            </div>
          ) : null}
        </dl>
      </Card>
    </div>
  );
}
