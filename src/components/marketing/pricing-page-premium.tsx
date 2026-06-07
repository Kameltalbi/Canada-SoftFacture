'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, X, ChevronDown, Star, Users, FileText, CreditCard, RefreshCw, Bell, BarChart3, Package, UserCheck, Shield, Globe, Zap, Building2, Lock, Phone } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { PlanId } from '@/lib/pricing-plans';
import { COMPARISON_BOOLEAN, COMPARISON_ROWS } from '@/lib/pricing-plans';

/* ─── Types ─── */
interface PlanLabels {
  name: string;
  audience: string;
  highlights: Record<string, string>;
}

interface Labels {
  title: string;
  subtitle: string;
  monthly: string;
  yearly: string;
  yearlyBadge: string;
  perMonth: string;
  perYear: string;
  billedYearly: string;
  trialBadge: string;
  popularBadge: string;
  ctaStarter: string;
  ctaPro: string;
  ctaBusiness: string;
  interacTooltip: string;
  footnote: string;
  trust: { trial: string; noCommitment: string; frenchSupport: string; securePayment: string; canadaHosting: string };
  compare: { title: string; subtitle: string; feature: string; yes: string; no: string; rows: Record<string, string>; cells: Record<string, Record<string, string>> };
  plans: Record<PlanId, PlanLabels>;
  faqTitle: string;
  faq: { [key: string]: { q: string; a: string } };
  finalCta: { title: string; subtitle: string; cta: string };
}

interface Props {
  planPrices: Record<PlanId, number>;
  labels: Labels;
}

/* ─── Highlight icon map ─── */
const HIGHLIGHT_ICONS: Record<string, React.ReactNode> = {
  users: <Users className="h-4 w-4" />,
  clients: <Users className="h-4 w-4" />,
  invoices: <FileText className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
  taxes: <CreditCard className="h-4 w-4" />,
  support: <Phone className="h-4 w-4" />,
  everything: <Check className="h-4 w-4" />,
  payments: <CreditCard className="h-4 w-4" />,
  interac: <Zap className="h-4 w-4" />,
  reminders: <Bell className="h-4 w-4" />,
  recurring: <RefreshCw className="h-4 w-4" />,
  stock: <Package className="h-4 w-4" />,
  accountant: <UserCheck className="h-4 w-4" />,
  stockAdvanced: <Package className="h-4 w-4" />,
  signature: <Shield className="h-4 w-4" />,
  api: <Globe className="h-4 w-4" />,
  multiCompany: <Building2 className="h-4 w-4" />,
  auditLog: <Lock className="h-4 w-4" />,
};

/* ─── Fade-in hook ─── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ─── FAQ Item ─── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
      >
        <span className="font-semibold text-[#0F172A]">{q}</span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? '200px' : '0px', opacity: open ? 1 : 0 }}
      >
        <p className="px-6 pb-5 text-sm leading-relaxed text-[#64748B]">{a}</p>
      </div>
    </div>
  );
}

/* ─── Compare Cell ─── */
function CompareCell({ value, yesLabel, noLabel }: { value: boolean; yesLabel: string; noLabel: string }) {
  return value ? (
    <span className="inline-flex items-center justify-center">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
        <Check className="h-3.5 w-3.5 text-[#10B981]" />
      </span>
      <span className="sr-only">{yesLabel}</span>
    </span>
  ) : (
    <span className="inline-flex items-center justify-center">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50">
        <X className="h-3.5 w-3.5 text-slate-300" />
      </span>
      <span className="sr-only">{noLabel}</span>
    </span>
  );
}

/* ─── Price display: $19⁹⁰ style ─── */
function PriceDisplay({ amount, period, light = false }: { amount: number; period: string; light?: boolean }) {
  const [dollars, cents] = amount.toFixed(2).split('.');
  const textColor = light ? 'text-white' : 'text-[#0F172A]';
  const subColor = light ? 'text-blue-200' : 'text-[#64748B]';
  return (
    <div className="flex items-start gap-0.5">
      <span className={`mt-3 text-2xl font-bold ${textColor}`}>$</span>
      <span className={`text-6xl font-extrabold leading-none tracking-tight ${textColor}`}>{dollars}</span>
      <div className="ml-0.5 flex flex-col justify-start pt-2">
        <span className={`text-xl font-bold leading-none ${textColor}`}>{cents}</span>
        <span className={`mt-1 whitespace-nowrap text-xs font-medium ${subColor}`}>CAD{period}</span>
      </div>
    </div>
  );
}

/* ─── Plan highlights list ─── */
function HighlightList({ highlights, light = false, interacTooltip = '' }: { highlights: Record<string, string>; light?: boolean; interacTooltip?: string }) {
  const textColor = light ? 'text-blue-100' : 'text-[#0F172A]';
  const iconBg = light ? 'bg-white/10' : 'bg-slate-100';
  const iconColor = light ? 'text-[#10B981]' : 'text-[#0B1F52]';
  return (
    <ul className="flex-1 space-y-2.5">
      {Object.entries(highlights).map(([key, val]) => (
        <li key={key} className={`flex items-start gap-3 text-sm ${textColor}`}>
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
            {HIGHLIGHT_ICONS[key] ?? <Check className="h-3 w-3" />}
          </span>
          <span>
            {val}
            {key === 'interac' && interacTooltip && (
              <span
                className={`ml-1.5 cursor-help rounded px-1.5 py-0.5 text-[10px] font-semibold ${light ? 'bg-white/10 text-emerald-300' : 'bg-blue-50 text-[#0B1F52]'}`}
                title={interacTooltip}
              >
                ⓘ
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ─── Main Component ─── */
export function PricingPagePremium({ planPrices, labels }: Props) {
  const [yearly, setYearly] = useState(false);

  const monthly = { starter: planPrices.starter, pro: planPrices.pro, business: planPrices.business };
  const annual = {
    starter: Math.round(planPrices.starter * 10 * 100) / 100,
    pro: Math.round(planPrices.pro * 10 * 100) / 100,
    business: Math.round(planPrices.business * 10 * 100) / 100,
  };
  const prices = yearly ? annual : monthly;
  const period = yearly ? labels.perYear : labels.perMonth;

  return (
    <div style={{ background: '#F8FAFC' }}>

      {/* ── HERO ── */}
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-24 text-center md:px-8">
        <FadeIn>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A] md:text-5xl">
            {labels.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#64748B]">
            {labels.subtitle}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-[#64748B]">
            {[labels.trust.trial, labels.trust.noCommitment, labels.trust.frenchSupport, labels.trust.canadaHosting].map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#10B981]" />{label}
              </span>
            ))}
          </div>
        </FadeIn>

        {/* ── Toggle bloc style FreshBooks ── */}
        <FadeIn delay={100} className="mt-10 flex flex-col items-center gap-3">
          {/* Badge visible uniquement en mode annuel */}
          <div className="h-7">
            {yearly && (
              <span
                className="rounded-full px-4 py-1.5 text-sm font-bold"
                style={{ background: '#10B981', color: '#fff' }}
              >
                2 mois offerts au paiement annuel
              </span>
            )}
          </div>
          {/* Toggle pill */}
          <div
            className="inline-flex overflow-hidden rounded-full p-1"
            style={{ background: '#fff', boxShadow: '0 1px 4px rgba(15,23,42,.12)' }}
          >
            <button
              type="button"
              onClick={() => setYearly(false)}
              className="rounded-full px-6 py-2 text-sm font-bold transition-all duration-300"
              style={{
                background: !yearly ? '#0B1F52' : 'transparent',
                color: !yearly ? '#fff' : '#64748B',
              }}
            >
              {labels.monthly}
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className="rounded-full px-6 py-2 text-sm font-bold transition-all duration-300"
              style={{
                background: yearly ? '#0B1F52' : 'transparent',
                color: yearly ? '#fff' : '#64748B',
              }}
            >
              {labels.yearly}
            </button>
          </div>
        </FadeIn>
      </section>

      {/* ── PLAN CARDS — 3 cartes style FreshBooks ── */}
      <section className="mx-auto max-w-5xl px-4 pb-20 md:px-8">
        <div className="grid items-stretch gap-5 lg:grid-cols-3">

          {/* ESSENTIEL */}
          <FadeIn delay={0}>
            <div
              className="flex flex-col rounded-2xl bg-white p-7 transition-all duration-300 hover:-translate-y-0.5"
              style={{ boxShadow: '0 4px 24px rgba(15,23,42,.08)', border: '1px solid #E2E8F0' }}
            >
              <p className="text-lg font-bold text-[#0F172A]">{labels.plans.starter.name}</p>
              <p className="mt-0.5 text-sm text-[#64748B]">{labels.plans.starter.audience}</p>
              <div className="mt-5">
                <PriceDisplay amount={prices.starter} period={period} />
              </div>
              <p className="mt-2 text-xs font-semibold text-[#10B981]">{labels.trialBadge}</p>
              {yearly && <p className="text-xs text-[#64748B]">{labels.billedYearly}</p>}
              <hr className="my-5 border-slate-100" />
              <HighlightList highlights={labels.plans.starter.highlights} />
              <div className="mt-6 space-y-2">
                <Link href="/register?plan=starter" className="block">
                  <button
                    type="button"
                    className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all duration-300 hover:opacity-90"
                    style={{ background: '#10B981' }}
                  >
                    {labels.ctaStarter}
                  </button>
                </Link>
                <Link href="/register?plan=starter" className="block text-center text-xs font-medium text-[#64748B] hover:underline">
                  ou Essai gratuit 30 jours
                </Link>
              </div>
            </div>
          </FadeIn>

          {/* PRO — Most Popular, fond navy */}
          <FadeIn delay={80}>
            <div
              className="relative flex flex-col rounded-2xl p-7 transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: '#0B1F52', boxShadow: '0 8px 40px rgba(11,31,82,.3)' }}
            >
              {/* Most Popular intégré comme FreshBooks */}
              <div className="mb-3 flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-amber-400">{labels.popularBadge}</span>
              </div>
              <p className="text-lg font-bold text-white">{labels.plans.pro.name}</p>
              <p className="mt-0.5 text-sm text-blue-200">{labels.plans.pro.audience}</p>
              <div className="mt-5">
                <PriceDisplay amount={prices.pro} period={period} light />
              </div>
              <p className="mt-2 text-xs font-semibold text-emerald-300">{labels.trialBadge}</p>
              {yearly && <p className="text-xs text-blue-200">{labels.billedYearly}</p>}
              <hr className="my-5 border-white/10" />
              <HighlightList highlights={labels.plans.pro.highlights} light interacTooltip={labels.interacTooltip} />
              <div className="mt-6 space-y-2">
                <Link href="/register?plan=pro" className="block">
                  <button
                    type="button"
                    className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all duration-300 hover:opacity-90"
                    style={{ background: '#10B981' }}
                  >
                    {labels.ctaPro}
                  </button>
                </Link>
                <Link href="/register?plan=pro" className="block text-center text-xs font-medium text-emerald-300 hover:underline">
                  ou Essai gratuit 30 jours
                </Link>
              </div>
            </div>
          </FadeIn>

          {/* EXPERT */}
          <FadeIn delay={160}>
            <div
              className="flex flex-col rounded-2xl bg-white p-7 transition-all duration-300 hover:-translate-y-0.5"
              style={{ boxShadow: '0 4px 24px rgba(15,23,42,.08)', border: '1px solid #E2E8F0' }}
            >
              <p className="text-lg font-bold text-[#0F172A]">{labels.plans.business.name}</p>
              <p className="mt-0.5 text-sm text-[#64748B]">{labels.plans.business.audience}</p>
              <div className="mt-5">
                <PriceDisplay amount={prices.business} period={period} />
              </div>
              <p className="mt-2 text-xs font-semibold text-[#10B981]">{labels.trialBadge}</p>
              {yearly && <p className="text-xs text-[#64748B]">{labels.billedYearly}</p>}
              <hr className="my-5 border-slate-100" />
              <HighlightList highlights={labels.plans.business.highlights} />
              <div className="mt-6 space-y-2">
                <Link href="/register?plan=business" className="block">
                  <button
                    type="button"
                    className="w-full rounded-lg py-3 text-sm font-bold text-white transition-all duration-300 hover:opacity-90"
                    style={{ background: '#10B981' }}
                  >
                    {labels.ctaBusiness}
                  </button>
                </Link>
                <Link href="/register?plan=business" className="block text-center text-xs font-medium text-[#64748B] hover:underline">
                  ou Essai gratuit 30 jours
                </Link>
              </div>
            </div>
          </FadeIn>

        </div>
        <p className="mt-6 text-center text-xs text-[#64748B]">{labels.footnote}</p>
      </section>

      {/* ── COMPARE TABLE ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold text-[#0F172A]">{labels.compare.title}</h2>
            <p className="mt-2 text-center text-sm text-[#64748B]">{labels.compare.subtitle}</p>
          </FadeIn>
          <FadeIn delay={100} className="mt-10 overflow-x-auto">
            <div
              className="rounded-2xl"
              style={{ border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(15,23,42,.06)' }}
            >
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', background: '#F8FAFC' }}>
                    <th className="rounded-tl-2xl px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-[#64748B]">{labels.compare.feature}</th>
                    {(['starter', 'pro', 'business'] as PlanId[]).map((p, i) => (
                      <th
                        key={p}
                        className={`px-4 py-4 text-center text-sm font-bold ${i === 2 ? 'rounded-tr-2xl' : ''}`}
                        style={{ color: p === 'pro' ? '#0B1F52' : '#0F172A', background: p === 'pro' ? '#EEF2FF' : 'transparent' }}
                      >
                        {labels.plans[p].name}
                        {p === 'pro' && <Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.key}
                      className="transition-colors hover:bg-slate-50"
                      style={{ borderBottom: i < COMPARISON_ROWS.length - 1 ? '1px solid #F1F5F9' : 'none' }}
                    >
                      <td className="px-6 py-3 font-medium text-[#0F172A]">{labels.compare.rows[row.key]}</td>
                      {(['starter', 'pro', 'business'] as PlanId[]).map((p) => (
                        <td
                          key={p}
                          className="px-4 py-3 text-center text-[#64748B]"
                          style={{ background: p === 'pro' ? '#F8FAFF' : 'transparent' }}
                        >
                          {row.type === 'boolean' ? (
                            <CompareCell
                              value={COMPARISON_BOOLEAN[row.key]?.[p] ?? false}
                              yesLabel={labels.compare.yes}
                              noLabel={labels.compare.no}
                            />
                          ) : (
                            labels.compare.cells[p]?.[row.key] ?? '—'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 text-center md:px-8">
          <FadeIn>
            <h2 className="text-3xl font-bold text-[#0F172A]">Conçu pour les PME canadiennes</h2>
            <p className="mx-auto mt-3 max-w-xl text-[#64748B]">
              Des consultants, agences, travailleurs autonomes et entreprises utilisent SoftFacture pour gérer leurs devis, factures et paiements.
            </p>
          </FadeIn>
          <FadeIn delay={100} className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { quote: "Enfin un logiciel qui gère la TPS et la TVQ sans configuration compliquée. Je gagne des heures chaque semaine.", author: "Marie-Ève T.", role: "Consultante RH, Montréal" },
              { quote: "L'intégration Interac e-Transfert est parfaite. Nos paiements sont reçus 3 fois plus vite qu'avant.", author: "Jean-François L.", role: "Agence web, Québec" },
              { quote: "Migration depuis QuickBooks en 30 minutes. Le support francophone était là à chaque étape.", author: "Sarah B.", role: "Architecte, Ottawa" },
            ].map(({ quote, author, role }) => (
              <div
                key={author}
                className="rounded-2xl bg-white p-6 text-left"
                style={{ boxShadow: '0 2px 12px rgba(15,23,42,.07)', border: '1px solid #E2E8F0' }}
              >
                <div className="flex gap-0.5 text-amber-400">{'★★★★★'}</div>
                <p className="mt-3 text-sm leading-relaxed text-[#0F172A]">&ldquo;{quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0B1F52] text-sm font-bold text-white">
                    {author[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{author}</p>
                    <p className="text-xs text-[#64748B]">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-2xl px-4 md:px-8">
          <FadeIn>
            <h2 className="text-center text-3xl font-bold text-[#0F172A]">{labels.faqTitle}</h2>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ boxShadow: '0 2px 12px rgba(15,23,42,.05)' }}>
              {(['cancel', 'hidden', 'hosting', 'taxes', 'import', 'upgrade'] as const).map((key) => (
                <FaqItem key={key} q={labels.faq[key].q} a={labels.faq[key].a} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20">
        <FadeIn>
          <div
            className="mx-4 overflow-hidden rounded-3xl md:mx-auto md:max-w-4xl"
            style={{ background: 'linear-gradient(135deg, #0B1F52 0%, #1e3a8a 100%)', boxShadow: '0 20px 60px rgba(11,31,82,.25)' }}
          >
            <div className="px-8 py-16 text-center">
              <h2 className="text-3xl font-extrabold text-white md:text-4xl">{labels.finalCta.title}</h2>
              <p className="mx-auto mt-3 max-w-lg text-blue-200">{labels.finalCta.subtitle}</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register">
                  <button
                    type="button"
                    className="rounded-lg px-8 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:opacity-90"
                    style={{ background: '#10B981' }}
                  >
                    {labels.finalCta.cta}
                  </button>
                </Link>
                <Link href="/register?plan=business">
                  <button
                    type="button"
                    className="rounded-lg border border-white/25 px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/10"
                  >
                    {labels.ctaBusiness}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

    </div>
  );
}
