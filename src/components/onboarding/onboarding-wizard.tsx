'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/contexts/auth-context';
import { completeOnboarding } from '@/lib/onboarding-api';
import { usePublicBillingPlans } from '@/hooks/use-public-billing-plans';
import {
  formatEur,
  HIGHLIGHTED_PLAN_ID,
  PLAN_IDS,
  TRIAL_DAYS,
  type PlanId,
} from '@/lib/pricing-plans';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;

export function OnboardingWizard() {
  const t = useTranslations('onboarding');
  const tp = useTranslations('pricing');
  const toast = useToast();
  const { user, refreshMe } = useAuth();
  const { planPrices } = usePublicBillingPlans();

  const [step, setStep] = useState<Step>(1);
  const [pending, setPending] = useState(false);
  const hydratedRef = useRef(false);

  const [companyName, setCompanyName] = useState(user?.organization?.name ?? '');
  const [siret, setSiret] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [plan, setPlan] = useState<PlanId>(HIGHLIGHTED_PLAN_ID);

  useEffect(() => {
    if (!user || hydratedRef.current) return;
    hydratedRef.current = true;
    setCompanyName(user.organization?.name ?? '');
    setSiret(user.organization?.taxMatricule ?? user.organization?.billingSiret ?? '');
    setAddress(user.organization?.address ?? '');
    setPostalCode(user.organization?.postalCode ?? '');
    setCity(user.organization?.city ?? '');
  }, [user]);

  const adminName = user?.name?.trim() ?? '';
  const phone = user?.phone?.trim() ?? '';
  const billingEmail = (user?.organization?.billingEmail ?? user?.email ?? '').trim();

  const progressPct = useMemo(() => {
    if (step === 1) return 33;
    if (step === 2) return 66;
    return 100;
  }, [step]);

  function validateStep1() {
    if (!companyName.trim()) {
      toast.push(t('errors.companyName'), 'error');
      return false;
    }
    const digits = siret.replace(/\D/g, '');
    if (digits.length !== 14) {
      toast.push(t('errors.siret'), 'error');
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (!address.trim() || !postalCode.trim() || !city.trim()) {
      toast.push(t('errors.address'), 'error');
      return false;
    }
    if (!adminName) {
      toast.push(t('errors.adminName'), 'error');
      return false;
    }
    if (phone.length < 8) {
      toast.push(t('errors.phone'), 'error');
      return false;
    }
    if (!billingEmail) {
      toast.push(t('errors.billingEmail'), 'error');
      return false;
    }
    return true;
  }

  async function handleFinish() {
    if (!validateStep1() || !validateStep2()) {
      setStep(validateStep1() ? 2 : 1);
      return;
    }

    setPending(true);
    try {
      await completeOnboarding({
        plan,
        companyName: companyName.trim(),
        siret: siret.replace(/\D/g, ''),
        address: address.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
        country: 'FR',
        adminName: adminName,
        phone: phone,
        billingEmail: billingEmail,
        vatNumber: vatNumber.trim() || null,
      });
      await refreshMe();
      toast.push(t('success'));
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : t('errors.generic'), 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-slate-900">{t('step1Title')}</h2>
            <p className="mt-2 text-sm text-slate-600">{t('step1Subtitle')}</p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {t('country')}
                </label>
                <Input value="France" readOnly disabled className="bg-slate-50" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {t('companyName')} *
                </label>
                <Input value={companyName} readOnly disabled className="bg-slate-50" required />
                <p className="mt-1 text-[10px] text-slate-500">{t('prefilledFromRegister')}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {t('siret')} *
                </label>
                <Input
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  placeholder="12345678901234"
                  maxLength={17}
                  required
                />
                <p className="mt-1 text-[10px] text-slate-500">{t('siretHint')}</p>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button
                type="button"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
              >
                {t('continue')}
                <ChevronRight className="ms-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-slate-900">{t('step2Title')}</h2>
            <p className="mt-2 text-sm text-slate-600">{t('step2Subtitle')}</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-xs font-medium text-slate-500">{t('contactFromRegister')}</p>
                <dl className="mt-2 space-y-1 text-slate-800">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-500">{t('adminName')} :</dt>
                    <dd className="font-medium">{adminName || '—'}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-500">{t('phone')} :</dt>
                    <dd className="font-medium">{phone || '—'}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-slate-500">{t('billingEmail')} :</dt>
                    <dd className="font-medium">{billingEmail || '—'}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {t('address')} *
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('addressPlaceholder')}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    {t('postalCode')} *
                  </label>
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="75001"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    {t('city')} *
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Paris"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  {t('vatNumber')}
                </label>
                <Input
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="FR12345678901"
                />
                <p className="mt-1 text-[10px] text-slate-500">{t('vatHint')}</p>
              </div>
            </div>
            <div className="mt-8 flex justify-between gap-3">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                {t('back')}
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  if (validateStep2()) setStep(3);
                }}
              >
                {t('continue')}
                <ChevronRight className="ms-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-slate-900">{t('step3Title')}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {t('step3Subtitle', { days: TRIAL_DAYS })}
            </p>
            <div className="mt-6 space-y-3">
              {PLAN_IDS.map((planId) => {
                const selected = plan === planId;
                const highlighted = planId === HIGHLIGHTED_PLAN_ID;
                return (
                  <button
                    key={planId}
                    type="button"
                    onClick={() => setPlan(planId)}
                    className={cn(
                      'w-full rounded-xl border-2 p-4 text-left transition',
                      selected
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                          selected
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300'
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {tp(`plans.${planId}.name`)}
                          </span>
                          {highlighted ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              {tp('popularBadge')}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {tp(`plans.${planId}.audience`)}
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-900">
                          {formatEur(planPrices[planId])} € HT{tp('perMonth')}
                          <span className="ms-2 text-xs font-medium text-emerald-700">
                            — {tp('trialBadge')}
                          </span>
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-8 flex justify-between gap-3">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                {t('back')}
              </Button>
              <Button
                type="button"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={pending}
                onClick={() => void handleFinish()}
              >
                {pending ? '…' : t('finish')}
                <ChevronRight className="ms-1 h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
