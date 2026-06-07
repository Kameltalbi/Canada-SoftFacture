import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Link } from '@/i18n/navigation';
import { LEGAL_SITE, brandOfCompanySentence } from '@/lib/legal-site';
import type { ReactNode } from 'react';

export function LegalPageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-16">
        <header className="mb-10 border-b border-slate-200 pb-6">
          <p className="text-sm font-medium text-emerald-700">{LEGAL_SITE.brand}</p>
          <p className="text-xs text-slate-500">{brandOfCompanySentence()}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-3 text-sm text-slate-500">
            Dernière mise à jour : {LEGAL_SITE.lastUpdated}
          </p>
        </header>
        <div className="legal-prose space-y-8 text-slate-700">{children}</div>
        <footer className="mt-12 flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <Link href="/mentions-legales" className="hover:text-slate-900">
            Mentions légales
          </Link>
          <Link href="/cgv" className="hover:text-slate-900">
            CGV / CGU
          </Link>
          <Link href="/politique-de-confidentialite" className="hover:text-slate-900">
            Confidentialité
          </Link>
          <Link href="/tarifs" className="hover:text-slate-900">
            Tarifs
          </Link>
          <Link href="/" className="hover:text-slate-900">
            Accueil
          </Link>
        </footer>
      </article>
    </MarketingShell>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
