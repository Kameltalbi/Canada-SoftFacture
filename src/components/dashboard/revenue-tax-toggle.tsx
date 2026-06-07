'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type RevenueTaxMode = 'ht' | 'ttc';

export function RevenueTaxToggle({
  mode,
  onChange,
}: {
  mode: RevenueTaxMode;
  onChange: (mode: RevenueTaxMode) => void;
}) {
  const t = useTranslations('dashboard');

  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'text-sm font-semibold transition-colors',
          mode === 'ht' ? 'text-violet-600' : 'text-s-muted'
        )}
      >
        {t('taxModeHt')}
      </span>
      <Switch
        checked={mode === 'ttc'}
        onCheckedChange={(checked) => onChange(checked ? 'ttc' : 'ht')}
        variant="violet"
        aria-label={t('taxModeToggle')}
      />
      <span
        className={cn(
          'text-sm font-semibold transition-colors',
          mode === 'ttc' ? 'text-violet-600' : 'text-s-muted'
        )}
      >
        {t('taxModeTtc')}
      </span>
    </div>
  );
}
