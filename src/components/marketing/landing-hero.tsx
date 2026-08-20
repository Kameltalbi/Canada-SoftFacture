import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, BadgeCheck, Lock, Server, ShieldCheck, Zap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { HeroVisual } from '@/components/marketing/hero-visual';

const TRUST_ICONS = [Server, ShieldCheck, Lock, BadgeCheck] as const;

export async function LandingHero() {
  const t = await getTranslations('marketing');

  const trustItems = [
    { icon: TRUST_ICONS[0], label: t('heroTrustFrance') },
    { icon: TRUST_ICONS[1], label: t('heroTrustGdpr') },
    { icon: TRUST_ICONS[2], label: t('heroTrustSecure') },
    { icon: TRUST_ICONS[3], label: t('heroTrustNoCommit') },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 py-16 md:py-20 lg:py-24">
      <div
        className="pointer-events-none absolute -end-32 top-0 h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-8 lg:grid-cols-2 lg:gap-16">
        <div className="order-2 lg:order-1">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-sm font-medium text-emerald-800">
            <Zap className="h-3.5 w-3.5" aria-hidden />
            {t('heroBadge')}
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-900 md:text-5xl lg:text-[3.15rem]">
            <span className="block">{t('heroTitle')}</span>
            <span className="relative mt-1 inline-block text-emerald-600">
              {t('heroTitleFree')}
              <span
                className="absolute inset-x-0 -bottom-1 h-1 rounded-full bg-emerald-500"
                aria-hidden
              />
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600 md:text-xl">
            {t('heroSubtitle')}
          </p>

          <div className="mt-8 flex flex-col gap-2.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/register" className="sm:shrink-0">
                <Button
                  size="lg"
                  className="h-12 w-full bg-brand px-8 text-base font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-hover sm:w-auto"
                >
                  {t('ctaPrimary')}
                  <ArrowRight className="ms-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#pricing" className="sm:shrink-0">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 w-full border border-slate-200 bg-white px-8 text-base font-semibold text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto"
                >
                  {t('ctaSecondary')}
                </Button>
              </Link>
            </div>
            <p className="text-sm text-slate-500">{t('heroNoPayment')}</p>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-slate-700 md:flex-nowrap md:gap-x-6">
            {trustItems.map(({ icon: Icon, label }) => (
              <li key={label} className="flex shrink-0 items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="whitespace-nowrap">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-1 lg:order-2">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
