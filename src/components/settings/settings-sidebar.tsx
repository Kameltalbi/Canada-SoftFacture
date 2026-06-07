'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { SETTINGS_NAV_GROUPS, type SettingsSectionId } from '@/components/settings/settings-config';

type Props = {
  active: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
  className?: string;
};

export function SettingsSidebar({ active, onSelect, className }: Props) {
  const t = useTranslations('settings');

  const allItems = SETTINGS_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ item, group }))
  );

  return (
    <nav
      className={cn(
        'w-full shrink-0 bg-white/70 backdrop-blur md:h-full md:w-64 md:overflow-y-auto md:border-e md:border-slate-200',
        className
      )}
      aria-label={t('title')}
    >
      {/* Sélecteur déroulant — mobile uniquement */}
      <div className="border-b border-slate-200 px-4 py-3 md:hidden">
        <select
          value={active}
          onChange={(e) => onSelect(e.target.value as SettingsSectionId)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {allItems.map(({ item }) =>
            !item.soon ? (
              <option key={item.id} value={item.id}>
                {t(item.labelKey)}
              </option>
            ) : null
          )}
        </select>
      </div>

      {/* Liste latérale — desktop uniquement */}
      <div className="hidden px-4 py-5 md:block">
        {SETTINGS_NAV_GROUPS.map((group) => {
          const singleItem = group.items.length === 1 ? group.items[0] : null;

          if (singleItem) {
            const isActive = active === singleItem.id;
            return (
              <div key={group.id} className="mb-6 last:mb-0">
                <ul>
                  <li>
                    <button
                      type="button"
                      onClick={() => !singleItem.soon && onSelect(singleItem.id)}
                      disabled={singleItem.soon}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                        isActive
                          ? 'bg-blue-50 font-semibold text-brand-blue shadow-sm ring-1 ring-blue-100'
                          : 'font-medium text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm',
                        singleItem.soon && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      <singleItem.icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">{t(singleItem.labelKey)}</span>
                      {singleItem.soon ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                          {t('soon')}
                        </span>
                      ) : null}
                    </button>
                  </li>
                </ul>
              </div>
            );
          }

          return (
            <div key={group.id} className="mb-6 last:mb-0">
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {t(group.labelKey)}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = active === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => !item.soon && onSelect(item.id)}
                        disabled={item.soon}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                          isActive
                            ? 'bg-blue-50 font-semibold text-brand-blue shadow-sm ring-1 ring-blue-100'
                            : 'font-medium text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm',
                          item.soon && 'cursor-not-allowed opacity-50'
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1">{t(item.labelKey)}</span>
                        {item.soon ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-slate-400">
                            {t('soon')}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
