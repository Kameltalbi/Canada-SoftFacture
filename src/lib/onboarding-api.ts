import { apiFetch } from '@/lib/api-client';
import type { PlanId } from '@/lib/pricing-plans';

export type OnboardingCompletePayload = {
  plan: PlanId;
  companyName: string;
  siret: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  adminName: string;
  phone: string;
  billingEmail: string;
  vatNumber?: string | null;
};

export type OnboardingCompleteResponse = {
  organization: {
    id: string;
    name: string;
    onboardingCompletedAt: string | null;
    subscriptionPlan: string;
    billingStatus: string;
    trialEndsAt: string | null;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    role: string;
    organizationId: string | null;
  };
};

export function completeOnboarding(body: OnboardingCompletePayload) {
  return apiFetch<OnboardingCompleteResponse>('/organizations/onboarding/complete', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
