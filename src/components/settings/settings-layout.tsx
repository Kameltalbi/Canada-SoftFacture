'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SettingsSidebar } from '@/components/settings/settings-sidebar';
import type { SettingsSectionId } from '@/components/settings/settings-config';

type Props = {
  activeSection: SettingsSectionId;
  onSectionChange: (id: SettingsSectionId) => void;
  children: React.ReactNode;
  /** Plein écran pour l’éditeur d’apparence (aperçu + rail droit). */
  variant?: 'default' | 'fullscreen';
  /** Masque la navigation latérale (ex. panneau droit ouvert). */
  sidebarCollapsed?: boolean;
};

export function SettingsLayout({
  activeSection,
  onSectionChange,
  children,
  variant = 'default',
  sidebarCollapsed = false,
}: Props) {
  const t = useTranslations('settings');

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-[#f6f8fb]">
      <header className="z-10 shrink-0 border-b border-slate-200/80 bg-white/95 px-4 py-5 shadow-sm md:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-brand-blue shadow-sm">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">{t('title')}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">{t('subtitleApp')}</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-blue/30 hover:bg-blue-50 hover:text-brand-blue"
          >
            ← {t('backLabel')}
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div
          className={cn(
            'shrink-0 transition-all duration-300 ease-out',
            sidebarCollapsed && 'xl:hidden'
          )}
        >
          <SettingsSidebar active={activeSection} onSelect={onSectionChange} />
        </div>
        <div
          className={cn(
            'min-h-0 min-w-0 flex-1',
            variant === 'fullscreen' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'
          )}
        >
          <div
            className={cn(
              variant === 'fullscreen'
                ? 'flex min-h-0 flex-1 flex-col'
                : 'mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
