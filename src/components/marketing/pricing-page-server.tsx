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
        popularBadge: t('popularBadge'),
        ctaStarter: t('ctaStarter'),
        ctaPro: t('ctaPro'),
        ctaBusiness: t('ctaBusiness'),
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
            reminders: t('compare.rows.reminders'),
            payments: t('compare.rows.payments'),
            accountingExport: t('compare.rows.accountingExport'),
            accountantAccess: t('compare.rows.accountantAccess'),
            stock: t('compare.rows.stock'),
            pdfTemplates: t('compare.rows.pdfTemplates'),
            dashboard: t('compare.rows.dashboard'),
            signature: t('compare.rows.signature'),
            multiCompany: t('compare.rows.multiCompany'),
            api: t('compare.rows.api'),
            expenses: t('compare.rows.expenses'),
            support: t('compare.rows.support'),
          },
          cells: {
            starter: {
              users: t('compare.cells.starter.users'),
              quotes: t('compare.cells.starter.quotes'),
              invoices: t('compare.cells.starter.invoices'),
              reminders: t('compare.cells.starter.reminders'),
              payments: t('compare.cells.starter.payments'),
              accountingExport: t('compare.cells.starter.accountingExport'),
              stock: t('compare.cells.starter.stock'),
              pdfTemplates: t('compare.cells.starter.pdfTemplates'),
              dashboard: t('compare.cells.starter.dashboard'),
              multiCompany: t('compare.cells.starter.multiCompany'),
              support: t('compare.cells.starter.support'),
            },
            pro: {
              users: t('compare.cells.pro.users'),
              quotes: t('compare.cells.pro.quotes'),
              invoices: t('compare.cells.pro.invoices'),
              reminders: t('compare.cells.pro.reminders'),
              payments: t('compare.cells.pro.payments'),
              accountingExport: t('compare.cells.pro.accountingExport'),
              stock: t('compare.cells.pro.stock'),
              pdfTemplates: t('compare.cells.pro.pdfTemplates'),
              dashboard: t('compare.cells.pro.dashboard'),
              multiCompany: t('compare.cells.pro.multiCompany'),
              support: t('compare.cells.pro.support'),
            },
            business: {
              users: t('compare.cells.business.users'),
              quotes: t('compare.cells.business.quotes'),
              invoices: t('compare.cells.business.invoices'),
              reminders: t('compare.cells.business.reminders'),
              payments: t('compare.cells.business.payments'),
              accountingExport: t('compare.cells.business.accountingExport'),
              stock: t('compare.cells.business.stock'),
              pdfTemplates: t('compare.cells.business.pdfTemplates'),
              dashboard: t('compare.cells.business.dashboard'),
              multiCompany: t('compare.cells.business.multiCompany'),
              support: t('compare.cells.business.support'),
            },
          },
        },
        plans: {
          starter: {
            name: t('plans.starter.name'),
            audience: t('plans.starter.audience'),
            highlights: {
              users: t('plans.starter.highlights.users'),
              clients: t('plans.starter.highlights.clients'),
              invoices: t('plans.starter.highlights.invoices'),
              pdf: t('plans.starter.highlights.pdf'),
              taxes: t('plans.starter.highlights.taxes'),
              support: t('plans.starter.highlights.support'),
            },
          },
          pro: {
            name: t('plans.pro.name'),
            audience: t('plans.pro.audience'),
            highlights: {
              everything: t('plans.pro.highlights.everything'),
              users: t('plans.pro.highlights.users'),
              payments: t('plans.pro.highlights.payments'),
              interac: t('plans.pro.highlights.interac'),
              reminders: t('plans.pro.highlights.reminders'),
              recurring: t('plans.pro.highlights.recurring'),
              stock: t('plans.pro.highlights.stock'),
              accountant: t('plans.pro.highlights.accountant'),
            },
          },
          business: {
            name: t('plans.business.name'),
            audience: t('plans.business.audience'),
            highlights: {
              everything: t('plans.business.highlights.everything'),
              users: t('plans.business.highlights.users'),
              stockAdvanced: t('plans.business.highlights.stockAdvanced'),
              signature: t('plans.business.highlights.signature'),
              api: t('plans.business.highlights.api'),
              multiCompany: t('plans.business.highlights.multiCompany'),
              auditLog: t('plans.business.highlights.auditLog'),
              support: t('plans.business.highlights.support'),
            },
          },
        },
        faq: {
          cancel: { q: t('faq.cancel.q'), a: t('faq.cancel.a') },
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
