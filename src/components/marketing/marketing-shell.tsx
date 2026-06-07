import { Link } from '@/i18n/navigation';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

export async function MarketingShell({
  children,
  activeNav,
}: {
  children: ReactNode;
  activeNav?: 'pricing' | 'home';
}) {
  const t = await getTranslations('marketing');
  const navT = await getTranslations('nav');

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <BrandLogo href="/" />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link
              href="/"
              className={
                activeNav === 'home' ? 'text-slate-900' : 'transition hover:text-slate-900'
              }
            >
              {t('navProduct')}
            </Link>
            <Link
              href="/tarifs"
              className={
                activeNav === 'pricing' ? 'text-slate-900' : 'transition hover:text-slate-900'
              }
            >
              {t('navPricing')}
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {typeof LocaleSwitcher === 'function' ? (
              <LocaleSwitcher className="hidden sm:inline-flex" />
            ) : null}
            <Link href="/login" className="hidden sm:inline">
              <Button className="bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue-hover">
                {navT('login')}
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-brand text-white shadow-md shadow-brand/20 hover:bg-brand-hover">
                {navT('register')}
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-slate-500 md:flex-row md:px-8 md:text-left">
          <p>
            © {new Date().getFullYear()} Nexiora — {t('footerBrandNote')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/tarifs" className="hover:text-slate-800">
              {t('navPricing')}
            </Link>
            <Link href="/mentions-legales" className="hover:text-slate-800">
              {t('footerLegal')}
            </Link>
            <Link href="/cgv" className="hover:text-slate-800">
              {t('footerCgv')}
            </Link>
            <Link href="/politique-de-confidentialite" className="hover:text-slate-800">
              {t('footerPrivacy')}
            </Link>
            <Link href="/login" className="hover:text-slate-800">
              {navT('login')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
