'use client';

import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FEATURES } from '@/lib/feature-flags';

export function LocaleSwitcher({
  className,
  variant = 'default',
}: {
  className?: string;
  variant?: 'default' | 'hero';
}) {
  const pathname = usePathname();
  const active = useLocale();
  const isHero = variant === 'hero';

  if (!FEATURES.localeSwitcher) {
    return null;
  }
  return (
    <div
      className={cn(
        'inline-flex rounded-full p-0.5 text-xs font-semibold',
        isHero
          ? 'border border-white/25 bg-white/10 backdrop-blur-sm'
          : 'border border-s-border bg-white/90 shadow-sm',
        className
      )}
    >
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          className={cn(
            'rounded-full px-2.5 py-1 transition',
            isHero
              ? active === locale
                ? 'bg-white text-brand shadow-md'
                : 'text-white/85 hover:bg-white/15 hover:text-white'
              : active === locale
                ? 'bg-s-accent text-white shadow-sm'
                : 'text-s-muted hover:text-s-navy'
          )}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
