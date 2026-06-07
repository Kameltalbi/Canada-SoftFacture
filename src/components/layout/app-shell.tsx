'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  Shield,
  ChevronRight,
  BarChart3,
  ClipboardList,
  Receipt,
  RefreshCw,
  Inbox,
  Warehouse,
  Menu,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { resolveLogoDisplayUrl } from '@/lib/org-logo';
import { BrandWordmark } from '@/components/brand/brand-wordmark';
import { ProfileMenu } from '@/components/layout/profile-menu';
import { TenantHeaderPlan } from '@/components/layout/tenant-header-plan';
import { useLogout } from '@/hooks/use-logout';
import { FEATURES } from '@/lib/feature-flags';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { organizationManagesStock } from '@/lib/stock-management';

const billingLinks = [
  { href: '/invoices', key: 'invoices' as const, icon: FileText },
  ...(FEATURES.einvoiceUi
    ? [{ href: '/received-invoices' as const, key: 'receivedInvoices' as const, icon: Inbox }]
    : []),
  { href: '/quotes', key: 'quotes' as const, icon: ClipboardList },
  { href: '/invoices/deposit/new', key: 'depositInvoices' as const, icon: Receipt },
  { href: '/recurring-invoices', key: 'recurring' as const, icon: RefreshCw },
];

const mainNav = [
  { href: '/dashboard', key: 'dashboard' as const, icon: LayoutDashboard },
  { href: '/clients', key: 'clients' as const, icon: Users },
  { href: '/products', key: 'products' as const, icon: Package },
  { href: '/stock', key: 'stock' as const, icon: Warehouse },
  { href: '/settings', key: 'settings' as const, icon: Settings },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/settings') {
    return pathname === '/settings' || pathname.startsWith('/settings');
  }
  if (href === '/invoices') {
    return (
      pathname === '/invoices' ||
      (pathname.startsWith('/invoices/') && !pathname.startsWith('/invoices/deposit'))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isBillingActive(pathname: string): boolean {
  return billingLinks.some((l) => isNavActive(pathname, l.href));
}

function formatHeaderDateParts(date: Date): { date: string; time: string } {
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    date: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  };
}

function useLiveClock(tickMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);
  return now;
}

function orgInitialsFromName(name: string): string {
  return name
    .split(/[\s@]+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: 'USER' | 'ADMIN' | 'SUPERADMIN' };
  children: React.ReactNode;
}) {
  const { user: authUser } = useAuth();
  const logoutAndRedirect = useLogout();
  const t = useTranslations('nav');
  const pathname = usePathname();
  const now = useLiveClock();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(() => isBillingActive(pathname));

  const closeMobileSidebar = () => setMobileSidebarOpen(false);

  const isSuperadmin = user.role === 'SUPERADMIN';
  const organization = authUser?.organization;
  const orgName = organization?.name ?? '';
  const orgLogoUrl = resolveLogoDisplayUrl(organization?.logoUrl ?? null);
  const orgInitials = orgInitialsFromName(orgName || user.name || user.email || 'SF');
  const { date: headerDate, time: headerTime } = formatHeaderDateParts(now);
  const showStockNav = organizationManagesStock(organization);

  const navLinkClass = (active: boolean, collapsed: boolean) =>
    cn(
      'flex items-center rounded-lg text-sm font-medium transition',
      collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
      active ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    );

  const expandBilling = () => {
    setSidebarOpen(true);
    setBillingOpen(true);
  };

  const expandBillingMobile = () => {
    setBillingOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Overlay mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-40 flex w-64 flex-col border-e border-slate-200 bg-white transition-transform duration-300 ease-out md:hidden',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-4">
          {orgLogoUrl ? (
            <img src={orgLogoUrl} alt={orgName} className="h-10 max-w-[8rem] object-contain object-left" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
                {orgInitials.slice(0, 2)}
              </div>
              {orgName ? <p className="truncate text-sm font-semibold text-slate-800">{orgName}</p> : null}
            </div>
          )}
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Fermer le menu"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {!isSuperadmin && (
            <>
              <Link href="/dashboard" onClick={closeMobileSidebar}
                className={navLinkClass(isNavActive(pathname, '/dashboard'), false)}>
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {t('dashboard')}
              </Link>
              <div>
                <button type="button" onClick={() => { setBillingOpen((v) => !v); expandBillingMobile(); }}
                  className={navLinkClass(isBillingActive(pathname), false)}>
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-start">{t('billing')}</span>
                  <ChevronRight className={cn('h-4 w-4 shrink-0 transition', billingOpen ? 'rotate-90' : '')} />
                </button>
                {billingOpen ? (
                  <div className="ms-4 mt-0.5 space-y-0.5 border-s-2 border-slate-100 ps-2">
                    {billingLinks.map((item) => (
                      <Link key={item.href} href={item.href} onClick={closeMobileSidebar}
                        className={cn('flex items-center gap-2 rounded-md px-2 py-2 text-sm transition',
                          isNavActive(pathname, item.href) ? 'font-medium text-brand' : 'text-slate-500 hover:text-slate-800')}>
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        {t(item.key)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
              {mainNav.slice(1, -1).map((item) => {
                if (item.href === '/stock' && !showStockNav) return null;
                return (
                  <Link key={item.href} href={item.href} onClick={closeMobileSidebar}
                    className={navLinkClass(isNavActive(pathname, item.href), false)}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    {t(item.key)}
                  </Link>
                );
              })}
              <Link href="/settings" onClick={closeMobileSidebar}
                className={navLinkClass(isNavActive(pathname, '/settings'), false)}>
                <Settings className="h-4 w-4 shrink-0" />
                {t('settings')}
              </Link>
            </>
          )}
          {user.role === 'SUPERADMIN' ? (
            <Link href="/admin" onClick={closeMobileSidebar}
              className={navLinkClass(pathname.startsWith('/admin'), false)}>
              <Shield className="h-4 w-4 shrink-0" />
              {t('admin')}
            </Link>
          ) : null}
        </nav>
      </aside>

      {/* Sidebar desktop (collapse/expand) */}
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-40 hidden flex-col border-e border-slate-200 bg-white transition-[width] duration-300 ease-out md:flex',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        <div
          className={cn(
            'shrink-0 border-b border-slate-200',
            sidebarOpen ? 'px-4 py-4' : 'flex justify-center px-2 py-3'
          )}
        >
          {sidebarOpen ? (
            orgLogoUrl ? (
              <div className="flex min-h-[4.5rem] w-full items-center justify-start rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                <img
                  src={orgLogoUrl}
                  alt={orgName ? `Logo ${orgName}` : 'Logo entreprise'}
                  className="h-14 w-full max-w-full object-contain object-left"
                />
              </div>
            ) : (
              <div className="flex min-h-[4.5rem] items-center gap-3">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700"
                  title={orgName || undefined}
                >
                  {orgInitials}
                </div>
                {orgName ? (
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">
                    {orgName}
                  </p>
                ) : null}
              </div>
            )
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
              title={orgName || undefined}
            >
              {orgLogoUrl ? (
                <img
                  src={orgLogoUrl}
                  alt={orgName ? `Logo ${orgName}` : 'Logo entreprise'}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                orgInitials.slice(0, 2)
              )}
            </div>
          )}
          {sidebarOpen && orgLogoUrl && orgName ? (
            <p className="mt-2 truncate text-center text-xs font-medium text-slate-500">
              {orgName}
            </p>
          ) : null}
        </div>

        <nav
          className={cn(
            'flex flex-1 flex-col gap-0.5 overflow-y-auto',
            sidebarOpen ? 'p-3' : 'px-2 py-3'
          )}
        >
          {!isSuperadmin && (
            <>
              <Link
                href="/dashboard"
                title={sidebarOpen ? undefined : t('dashboard')}
                className={navLinkClass(isNavActive(pathname, '/dashboard'), !sidebarOpen)}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                {sidebarOpen ? t('dashboard') : null}
              </Link>

              <div>
                {sidebarOpen ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setBillingOpen((v) => !v)}
                      className={navLinkClass(isBillingActive(pathname), false)}
                    >
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-start">{t('billing')}</span>
                      <ChevronRight
                        className={cn(
                          'h-4 w-4 shrink-0 transition',
                          billingOpen ? 'rotate-90' : ''
                        )}
                      />
                    </button>
                    {billingOpen ? (
                      <div className="ms-4 mt-0.5 space-y-0.5 border-s-2 border-slate-100 ps-2">
                        {billingLinks.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition',
                              isNavActive(pathname, item.href)
                                ? 'font-medium text-brand'
                                : 'text-slate-500 hover:text-slate-800'
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            {t(item.key)}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <button
                    type="button"
                    title={t('billing')}
                    onClick={expandBilling}
                    className={cn(navLinkClass(isBillingActive(pathname), true), 'w-full')}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                  </button>
                )}
              </div>

              {mainNav.slice(1, -1).map((item) => {
                if (item.href === '/stock' && !showStockNav) return null;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarOpen ? undefined : t(item.key)}
                    className={navLinkClass(isNavActive(pathname, item.href), !sidebarOpen)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen ? t(item.key) : null}
                  </Link>
                );
              })}

              <Link
                href="/dashboard"
                title={sidebarOpen ? undefined : t('dataExport')}
                className={navLinkClass(false, !sidebarOpen)}
              >
                <BarChart3 className="h-4 w-4 shrink-0" />
                {sidebarOpen ? t('dataExport') : null}
              </Link>

              <Link
                href="/settings"
                title={sidebarOpen ? undefined : t('settings')}
                className={navLinkClass(isNavActive(pathname, '/settings'), !sidebarOpen)}
              >
                <Settings className="h-4 w-4 shrink-0" />
                {sidebarOpen ? t('settings') : null}
              </Link>
            </>
          )}

          {user.role === 'SUPERADMIN' ? (
            <Link
              href="/admin"
              title={sidebarOpen ? undefined : t('admin')}
              className={navLinkClass(pathname.startsWith('/admin'), !sidebarOpen)}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {sidebarOpen ? t('admin') : null}
            </Link>
          ) : null}
        </nav>

        <div
          className={cn('shrink-0 border-t border-slate-200', sidebarOpen ? 'px-3 py-3' : 'p-2')}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={t('toggleSidebar')}
            aria-expanded={sidebarOpen}
            title={t('toggleSidebar')}
            className={cn(
              'flex items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900',
              sidebarOpen ? 'w-full justify-center px-3 py-2.5' : 'mx-auto justify-center p-2.5'
            )}
          >
            <ChevronRight
              strokeWidth={2.5}
              className={cn(
                'h-5 w-5 shrink-0 transition-transform duration-300',
                sidebarOpen && 'rotate-180'
              )}
            />
          </button>
        </div>

        {sidebarOpen ? (
          <div className="shrink-0 border-t border-slate-200 px-4 py-4">
            <BrandWordmark className="text-base" />
            <p className="mt-1 text-[11px] text-slate-400">{t('appVersion')}</p>
            <p className="text-[10px] text-slate-400">{t('appCopyright')}</p>
          </div>
        ) : null}
      </aside>

      <div
        className={cn(
          'flex min-h-screen min-w-0 flex-1 flex-col transition-[margin-inline-start] duration-300 ease-out',
          'ms-0 md:ms-16',
          sidebarOpen ? 'md:ms-60' : 'md:ms-16'
        )}
      >
        <header className="sticky top-0 z-20 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {/* Hamburger mobile */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              {orgName ? (
                <p className="hidden truncate text-sm font-semibold text-slate-900 sm:block">
                  {orgName}
                </p>
              ) : null}
              {!isSuperadmin ? <TenantHeaderPlan organization={organization} /> : null}
            </div>
          </div>
          <time
            dateTime={now.toISOString()}
            className="hidden items-center justify-center gap-6 tabular-nums text-sm font-semibold sm:flex"
          >
            <span className="text-brand-blue">{headerDate}</span>
            <span className="text-brand">{headerTime}</span>
          </time>
          <div className="flex shrink-0 items-center justify-self-end gap-2">
            {FEATURES.localeSwitcher ? <LocaleSwitcher /> : null}
            <ProfileMenu user={user} onLogout={logoutAndRedirect} />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
