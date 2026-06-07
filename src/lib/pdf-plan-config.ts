/** Règles PDF par plan — miroir de backend/src/lib/pdfPlanConfig.ts */

export const PDF_TEMPLATE_IDS = ['CLASSIC', 'MODERN', 'MINIMAL', 'MONO', 'BLUE_PRO'] as const;
export type PdfTemplateId = (typeof PDF_TEMPLATE_IDS)[number];

export type SubscriptionPlanId = 'starter' | 'pro' | 'business';

export const PLAN_TO_API: Record<SubscriptionPlanId, 'STARTER' | 'PRO' | 'BUSINESS'> = {
  starter: 'STARTER',
  pro: 'PRO',
  business: 'BUSINESS',
};

export const API_TO_PLAN: Record<'STARTER' | 'PRO' | 'BUSINESS', SubscriptionPlanId> = {
  STARTER: 'starter',
  PRO: 'pro',
  BUSINESS: 'business',
};

export type PdfPlanLimits = {
  maxTemplates: number;
  unifiedTemplate: boolean;
  allowAccentColor: boolean;
  perDocumentAccentColor: boolean;
  allowedTemplates: PdfTemplateId[];
};

export const PLAN_PDF_LIMITS: Record<SubscriptionPlanId, PdfPlanLimits> = {
  starter: {
    maxTemplates: 1,
    unifiedTemplate: true,
    allowAccentColor: false,
    perDocumentAccentColor: false,
    allowedTemplates: ['CLASSIC'],
  },
  pro: {
    maxTemplates: 2,
    unifiedTemplate: true,
    allowAccentColor: true,
    perDocumentAccentColor: false,
    allowedTemplates: ['CLASSIC', 'MODERN', 'MONO', 'BLUE_PRO'],
  },
  business: {
    maxTemplates: 3,
    unifiedTemplate: false,
    allowAccentColor: true,
    perDocumentAccentColor: true,
    allowedTemplates: ['CLASSIC', 'MODERN', 'MINIMAL', 'MONO', 'BLUE_PRO'],
  },
};

export function normalizeHexColor(input: string, fallback = '#0f766e'): string {
  const v = input.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toLowerCase();
  if (/^[0-9A-Fa-f]{6}$/.test(v)) return `#${v.toLowerCase()}`;
  return fallback;
}

export function planFromApi(apiPlan: string | undefined): SubscriptionPlanId {
  if (apiPlan === 'PRO') return 'pro';
  if (apiPlan === 'BUSINESS') return 'business';
  return 'starter';
}
