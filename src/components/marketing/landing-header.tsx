import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import { BrandLogo } from '@/components/brand/brand-logo';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { MobileLandingMenu } from '@/components/marketing/mobile-landing-menu';

export async function LandingHeader() {
  const t = await getTranslations('marketing');
  const navT = await getTranslations('nav');

  const links = [
    { href: '#features', label: t('navFeatures') },
    { href: '#how', label: t('navHow') },
    { href: '/tarifs', label: t('navPricing') },
    { href: '#faq', label: t('navFaq') },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <BrandLogo href="/" priority />

        <nav className="hidden items-center gap-8 text-sm font-bold text-slate-700 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition hover:text-slate-900">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {typeof LocaleSwitcher === 'function' ? (
            <LocaleSwitcher className="hidden sm:inline-flex" />
          ) : null}
          <MobileLandingMenu
            links={links}
            loginLabel={navT('login')}
            registerLabel={navT('register')}
          />
          <Link href="/login" className="hidden sm:inline">
            <Button className="bg-brand-blue text-white shadow-md shadow-brand-blue/20 hover:bg-brand-blue-hover">
              {navT('login')}
            </Button>
          </Link>
          <Link href="/register" className="hidden sm:inline">
            <Button className="bg-brand text-white shadow-md shadow-brand/20 hover:bg-brand-hover">
              {navT('register')}
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
