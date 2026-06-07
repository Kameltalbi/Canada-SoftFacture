'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CreditCard, LogOut, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProfileUser = {
  name?: string | null;
  email?: string | null;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
};

function userInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email ?? 'U').charAt(0).toUpperCase();
}

function roleBadgeClass(role: ProfileUser['role']): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-emerald-500 text-white';
    case 'SUPERADMIN':
      return 'bg-violet-600 text-white';
    default:
      return 'bg-slate-500 text-white';
  }
}

export function ProfileMenu({ user, onLogout }: { user: ProfileUser; onLogout: () => void }) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = user.name?.trim() || t('defaultUserName');
  const initials = userInitials(user.name, user.email);

  const roleKey =
    user.role === 'ADMIN'
      ? 'roleOwner'
      : user.role === 'SUPERADMIN'
        ? 'roleSuperAdmin'
        : 'roleMember';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const menuItemClass =
    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition',
          'bg-violet-100 text-violet-700 ring-2 ring-white hover:bg-violet-200',
          open && 'ring-violet-300'
        )}
        aria-label={t('profileMenu')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {initials}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-50 mt-2 w-[17.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-4 text-center">
            <p className="text-base font-bold text-slate-900">{displayName}</p>
            {user.email ? (
              <p className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p>
            ) : null}
            <span
              className={cn(
                'mt-2 inline-flex rounded-full px-3 py-0.5 text-xs font-semibold',
                roleBadgeClass(user.role)
              )}
            >
              {t(roleKey)}
            </span>
          </div>

          <div className="py-1">
            <Link
              href="/profile"
              role="menuitem"
              className={menuItemClass}
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4 shrink-0 text-slate-400" />
              {t('profileMenuMyProfile')}
            </Link>
            {user.role !== 'SUPERADMIN' ? (
              <>
                <Link
                  href="/settings"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setOpen(false)}
                >
                  <Settings className="h-4 w-4 shrink-0 text-slate-400" />
                  {t('profileMenuSettings')}
                </Link>
                <Link
                  href="/subscription"
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setOpen(false)}
                >
                  <CreditCard className="h-4 w-4 shrink-0 text-slate-400" />
                  {t('profileMenuSubscription')}
                </Link>
              </>
            ) : (
              <Link
                href="/admin"
                role="menuitem"
                className={menuItemClass}
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4 shrink-0 text-slate-400" />
                {t('admin')}
              </Link>
            )}
          </div>

          <div className="border-t border-slate-100 py-1">
            <button
              type="button"
              role="menuitem"
              className={cn(menuItemClass, 'text-slate-700 hover:text-red-600')}
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogOut className="h-4 w-4 shrink-0 text-slate-400" />
              {t('profileMenuLogout')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
