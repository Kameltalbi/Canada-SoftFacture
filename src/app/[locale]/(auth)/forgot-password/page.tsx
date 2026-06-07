'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { BrandWordmark } from '@/components/brand/brand-wordmark';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';

const cardClassName =
  'rounded-2xl border border-s-border/60 bg-white px-8 py-10 shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:px-10';

export default function ForgotPasswordPage() {
  const t = useTranslations('passwordReset');
  const tc = useTranslations('common');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErr(t('emailRequired'));
      return;
    }

    setLoading(true);
    setErr(null);
    setDevResetUrl(null);
    try {
      const res = await apiFetch<{ ok: boolean; resetUrl?: string }>('/auth/forgot-password', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ email: trimmedEmail }),
      });
      setSent(true);
      if (res.resetUrl) setDevResetUrl(res.resetUrl);
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : '';
      const isUnreachableApi = ex instanceof TypeError || msg === 'Failed to fetch';
      setErr(isUnreachableApi ? t('networkError') : ex instanceof Error ? ex.message : tc('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cardClassName}>
      <div className="mb-8 text-center">
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label={t('backHome')}>
            <BrandWordmark />
          </Link>
        </div>
        <h1 className="text-xl font-bold text-s-navy">{t('forgotTitle')}</h1>
        <p className="mt-1.5 text-sm text-s-muted">{t('forgotSubtitle')}</p>
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-s-navy">{t('emailSent')}</p>
          {devResetUrl ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t('devLinkHint')}{' '}
              <Link
                href={`/reset-password?token=${new URL(devResetUrl).searchParams.get('token') ?? ''}`}
                className="font-medium underline"
              >
                {t('devLinkAction')}
              </Link>
            </p>
          ) : null}
          <Link
            href="/login"
            className="inline-block text-sm font-medium text-brand-blue hover:text-brand-blue-hover hover:underline"
          >
            {t('backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-sm font-medium text-s-navy">
              {t('email')}
            </label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder={t('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border-s-border/80 focus:border-brand-blue focus:ring-brand-blue/20"
            />
          </div>

          {err ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700"
            >
              {err}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full rounded-lg bg-brand-blue py-3 text-sm font-semibold text-white shadow-none hover:bg-brand-blue-hover focus-visible:outline-brand-blue"
            disabled={loading}
          >
            {loading ? t('sending') : t('sendLink')}
          </Button>

          <p className="text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-brand-blue hover:text-brand-blue-hover hover:underline"
            >
              {t('backToLogin')}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
