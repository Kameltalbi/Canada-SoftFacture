import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  FileText,
  Hammer,
  Layers,
  Lock,
  Receipt,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LandingFaq } from '@/components/marketing/landing-faq';
import { LandingProductPreview } from '@/components/marketing/landing-product-preview';

function SectionShell({
  id,
  className,
  children,
  alt = false,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
  alt?: boolean;
}) {
  return (
    <section id={id} className={cn('py-16 md:py-20', alt ? 'bg-slate-50' : 'bg-white', className)}>
      <div className="mx-auto max-w-7xl px-4 md:px-8">{children}</div>
    </section>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">{eyebrow}</p>
      ) : null}
      <h2
        className={cn(
          'text-3xl font-bold tracking-tight text-slate-900 md:text-4xl',
          eyebrow && 'mt-3'
        )}
      >
        {title}
      </h2>
    </div>
  );
}

export async function LandingProblemSection() {
  const t = await getTranslations('marketing');
  const pains = ['pain1', 'pain2', 'pain3', 'pain4', 'pain5'] as const;

  return (
    <SectionShell id="problem" alt>
      <SectionTitle title={t('problemTitle')} />
      <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">{t('problemIntro')}</p>
      <ul className="mx-auto mt-10 grid max-w-3xl gap-3">
        {pains.map((key) => (
          <li
            key={key}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-slate-700 shadow-sm"
          >
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
            {t(key)}
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-8 max-w-2xl text-center text-lg font-medium text-slate-800">
        {t('problemOutro')}
      </p>
    </SectionShell>
  );
}

const FEATURE_ICONS = [FileText, Receipt, TrendingUp, Bell, Users, BarChart3] as const;

export async function LandingFeaturesSection() {
  const t = await getTranslations('marketing');
  const keys = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const;

  return (
    <SectionShell id="features">
      <SectionTitle title={t('featuresTitle')} />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key, i) => {
          const Icon = FEATURE_ICONS[i];
          return (
            <div
              key={key}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{t(`${key}Title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(`${key}Desc`)}</p>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

export async function LandingHowSection() {
  const t = await getTranslations('marketing');
  const steps = ['how1', 'how2', 'how3'] as const;

  return (
    <SectionShell id="how" alt>
      <SectionTitle title={t('howSectionTitle')} />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {steps.map((key, idx) => (
          <div
            key={key}
            className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
              {idx + 1}
            </span>
            <h3 className="mt-4 text-lg font-bold text-slate-900">{t(`${key}Title`)}</h3>
            <p className="mt-2 text-sm text-slate-600">{t(`${key}Desc`)}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

const AUDIENCE_ICONS = [User, Briefcase, Hammer, Store, Layers, ShoppingBag] as const;

export async function LandingAudienceSection() {
  const t = await getTranslations('marketing');
  const cards = ['aud1', 'aud2', 'aud3', 'aud4', 'aud5', 'aud6'] as const;

  return (
    <SectionShell id="audience">
      <SectionTitle title={t('audienceTitle')} />
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:gap-5">
        {cards.map((key, i) => {
          const Icon = AUDIENCE_ICONS[i];
          return (
            <div
              key={key}
              className="flex flex-col items-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-4 py-8 text-center shadow-sm"
            >
              <Icon className="h-8 w-8 text-emerald-600" strokeWidth={1.5} />
              <p className="mt-3 font-semibold text-slate-900">{t(key)}</p>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

const BENEFIT_ICONS = [Sparkles, Zap, Lock, TrendingUp] as const;

export async function LandingBenefitsSection() {
  const t = await getTranslations('marketing');
  const keys = ['ben1', 'ben2', 'ben3', 'ben4'] as const;

  return (
    <SectionShell id="benefits" alt>
      <SectionTitle title={t('benefitsTitle')} />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {keys.map((key, i) => {
          const Icon = BENEFIT_ICONS[i];
          return (
            <div key={key} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <Icon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{t(`${key}Title`)}</h3>
              <p className="mt-2 text-sm text-slate-600">{t(`${key}Desc`)}</p>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

export async function LandingPreviewSection() {
  const t = await getTranslations('marketing');

  return (
    <SectionShell id="preview">
      <SectionTitle title={t('previewSectionTitle')} />
      <p className="mx-auto mt-4 max-w-2xl text-center text-slate-600">{t('previewSectionDesc')}</p>
      <div className="mt-10">
        <LandingProductPreview />
      </div>
    </SectionShell>
  );
}

export async function LandingFaqSection() {
  const t = await getTranslations('marketing');
  const items = ['faq1', 'faq2', 'faq3', 'faq4', 'faq5', 'faq6', 'faq7'] as const;
  const faqData = items.map((key) => ({
    q: t(`${key}Q`),
    a: t(`${key}A`),
  }));

  return (
    <SectionShell id="faq">
      <SectionTitle title={t('faqTitle')} />
      <div className="mx-auto mt-10 max-w-3xl">
        <LandingFaq items={faqData} />
      </div>
    </SectionShell>
  );
}

export async function LandingFinalCta() {
  const t = await getTranslations('marketing');

  return (
    <section className="bg-gradient-to-br from-emerald-700 to-emerald-900 py-16 text-white md:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center md:px-8">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t('finalCtaTitle')}</h2>
        <p className="mt-4 text-lg text-emerald-50/95">{t('finalCtaDesc')}</p>
        <Link href="/register" className="mt-8 inline-block">
          <Button
            size="lg"
            className="h-12 bg-white px-8 text-base font-semibold text-emerald-800 shadow-xl hover:bg-emerald-50"
          >
            {t('ctaPrimary')}
            <ArrowRight className="ms-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}

export async function LandingFooter() {
  const t = await getTranslations('marketing');
  const year = new Date().getFullYear();

  const columns = [
    {
      title: t('footerColProduct'),
      links: [
        { href: '#features', label: t('footerFeatures') },
        { href: '/tarifs', label: t('navPricing') },
        { href: '#faq', label: t('navFaq') },
        { href: '#preview', label: t('footerDemo') },
      ],
    },
    {
      title: t('footerColResources'),
      links: [
        { href: '/help', label: t('footerHelp') },
        { href: '/help', label: t('footerGuides') },
      ],
    },
    {
      title: t('footerColCompany'),
      links: [
        { href: `mailto:contact@softfacture.fr`, label: t('footerContact') },
        { href: '/mentions-legales', label: t('footerLegal') },
        { href: '/politique-de-confidentialite', label: t('footerPrivacy') },
        { href: '/cgv', label: t('footerCgv') },
      ],
    },
    {
      title: t('footerColLegal'),
      links: [
        { href: '/politique-de-confidentialite', label: t('footerRgpd') },
        { href: '/politique-de-confidentialite', label: t('footerCookies') },
        { href: '/politique-de-confidentialite', label: t('footerSecurity') },
      ],
    },
  ] as const;

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-bold text-slate-900">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('mailto:') ? (
                      <a href={link.href} className="text-sm text-slate-600 hover:text-emerald-700">
                        {link.label}
                      </a>
                    ) : link.href.startsWith('#') ? (
                      <a href={link.href} className="text-sm text-slate-600 hover:text-emerald-700">
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-slate-600 hover:text-emerald-700"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-slate-200 pt-8">
          <p className="font-semibold text-slate-900">SoftFacture © {year}</p>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('footerTagline')}</p>
          <p className="mt-2 text-xs text-slate-400">{t('footerBrandNote')}</p>
        </div>
      </div>
    </footer>
  );
}
