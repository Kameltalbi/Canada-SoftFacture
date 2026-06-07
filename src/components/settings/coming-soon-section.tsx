'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';

export function ComingSoonSection({ title }: { title: string }) {
  const t = useTranslations('settings');

  return (
    <Card className="border-dashed border-s-border bg-slate-50/50">
      <h2 className="text-lg font-semibold text-s-navy">{title}</h2>
      <p className="mt-2 text-sm text-s-muted">{t('comingSoonBody')}</p>
    </Card>
  );
}
