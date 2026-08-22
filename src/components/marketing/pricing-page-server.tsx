import { getTranslations } from 'next-intl/server';
import { getPublicBillingPlans, planPricesHtFromBilling } from '@/lib/billing-api';
import { PricingPagePremium } from '@/components/marketing/pricing-page-premium';

export async function PricingPageServer() {
  const t = await getTranslations('pricing');
  const billing = await getPublicBillingPlans();
  const planPrices = planPricesHtFromBilling(billing);

  return (
    <PricingPagePremium
      planPrices={planPrices}
      labels={{
        title: t('title'),
        subtitle: t('subtitle'),
        monthly: t('billingToggle.monthly'),
        yearly: t('billingToggle.yearly'),
        yearlyBadge: t('billingToggle.yearlyBadge'),
        perMonth: t('perMonth'),
        perYear: t('perYear'),
        billedYearly: t('billedYearly'),
        trialBadge: t('trialBadge'),
        forever: t('forever'),
        popularBadge: t('popularBadge'),
        ctaStarter: t('ctaStarter'),
        ctaPro: t('ctaPro'),
        interacTooltip: t('interacTooltip'),
        footnote: t('footnote'),
        faqTitle: t('faq.title'),
        trust: {
          trial: t('trust.trial'),
          noCommitment: t('trust.noCommitment'),
          frenchSupport: t('trust.frenchSupport'),
          securePayment: t('trust.securePayment'),
          canadaHosting: t('trust.canadaHosting'),
        },
        compare: {
          title: t('compare.title'),
          subtitle: t('compare.subtitle'),
          feature: t('compare.feature'),
          yes: t('compare.yes'),
          no: t('compare.no'),
          rows: {
            users: t('compare.rows.users'),
            quotes: t('compare.rows.quotes'),
            invoices: t('compare.rows.invoices'),
            creditNotesDeposits: t('compare.rows.creditNotesDeposits'),
            recurring: t('compare.rows.recurring'),
            collections: t('compare.rows.collections'),
            payments: t('compare.rows.payments'),
            stock: t('compare.rows.stock'),
            pdfTemplates: t('compare.rows.pdfTemplates'),
            dashboard: t('compare.rows.dashboard'),
            support: t('compare.rows.support'),
          },
          cells: {
            starter: {
              users: t('compare.cells.starter.users'),
              quotes: t('compare.cells.starter.quotes'),
              invoices: t('compare.cells.starter.invoices'),
              payments: t('compare.cells.starter.payments'),
              stock: t('compare.cells.starter.stock'),
              pdfTemplates: t('compare.cells.starter.pdfTemplates'),
              dashboard: t('compare.cells.starter.dashboard'),
              support: t('compare.cells.starter.support'),
            },
            pro: {
              users: t('compare.cells.pro.users'),
              quotes: t('compare.cells.pro.quotes'),
              invoices: t('compare.cells.pro.invoices'),
              payments: t('compare.cells.pro.payments'),
              stock: t('compare.cells.pro.stock'),
              pdfTemplates: t('compare.cells.pro.pdfTemplates'),
              dashboard: t('compare.cells.pro.dashboard'),
              support: t('compare.cells.pro.support'),
            },
          },
        },
        plans: {
          starter: {
            name: t('plans.starter.name'),
            audience: t('plans.starter.audience'),
            highlights: {
              clients: t('plans.starter.highlights.clients'),
              quotes: t('plans.starter.highlights.quotes'),
              invoices: t('plans.starter.highlights.invoices'),
              products: t('plans.starter.highlights.products'),
              pdf: t('plans.starter.highlights.pdf'),
              taxes: t('plans.starter.highlights.taxes'),
              deposits: t('plans.starter.highlights.deposits'),
              creditNotes: t('plans.starter.highlights.creditNotes'),
              payments: t('plans.starter.highlights.payments'),
              dashboard: t('plans.starter.highlights.dashboard'),
              export: t('plans.starter.highlights.export'),
              users: t('plans.starter.highlights.users'),
            },
          },
          pro: {
            name: t('plans.pro.name'),
            audience: t('plans.pro.audience'),
            highlights: {
              everything: t('plans.pro.highlights.everything'),
              recurring: t('plans.pro.highlights.recurring'),
              collections: t('plans.pro.highlights.collections'),
              users: t('plans.pro.highlights.users'),
              pdfAdvanced: t('plans.pro.highlights.pdfAdvanced'),
              stock: t('plans.pro.highlights.stock'),
              support: t('plans.pro.highlights.support'),
            },
          },
        },
        faq: {
          cancel: { q: t('faq.cancel.q'), a: t('faq.cancel.a') },
          free: { q: t('faq.free.q'), a: t('faq.free.a') },
          hidden: { q: t('faq.hidden.q'), a: t('faq.hidden.a') },
          hosting: { q: t('faq.hosting.q'), a: t('faq.hosting.a') },
          taxes: { q: t('faq.taxes.q'), a: t('faq.taxes.a') },
          import: { q: t('faq.import.q'), a: t('faq.import.a') },
          upgrade: { q: t('faq.upgrade.q'), a: t('faq.upgrade.a') },
        },
        finalCta: {
          title: t('finalCta.title'),
          subtitle: t('finalCta.subtitle'),
          cta: t('finalCta.cta'),
        },
      }}
    />
  );
}
