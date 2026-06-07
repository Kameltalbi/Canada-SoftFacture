'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { BrandWordmark } from '@/components/brand/brand-wordmark';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

const cardClassName =
  'rounded-2xl border border-s-border/60 bg-white px-8 py-10 shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:px-10';

function ResetPasswordForm() {
  const t = useTranslations('passwordReset');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token') ?? '';
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('missingToken'));
      return;
    }
    void apiFetch<{ email: string }>(`/auth/reset-password?token=${encodeURIComponent(token)}`, {
      skipAuth: true,
    })
      .then((data) => setEmail(data.email))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t('invalidToken'));
      });
  }, [token, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setError(t('passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tc('error'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={cardClassName}>
        <div className="space-y-4 text-center">
          <h1 className="text-xl font-bold text-s-navy">{t('resetSuccessTitle')}</h1>
          <p className="text-sm text-s-muted">{t('resetSuccessBody')}</p>
          <Button
            type="button"
            className="w-full rounded-lg bg-brand-blue py-3 text-sm font-semibold text-white shadow-none hover:bg-brand-blue-hover"
            onClick={() => router.replace('/login')}
          >
            {t('backToLogin')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClassName}>
      <div className="mb-8 text-center">
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label={t('backHome')}>
            <BrandWordmark />
          </Link>
        </div>
        <h1 className="text-xl font-bold text-s-navy">{t('resetTitle')}</h1>
        <p className="mt-1.5 text-sm text-s-muted">{t('resetSubtitle')}</p>
      </div>

      {error && !email ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-medium text-brand-blue hover:underline"
          >
            {t('requestNewLink')}
          </Link>
        </div>
      ) : email ? (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
          <p className="text-center text-sm text-s-muted">{t('resetForEmail', { email })}</p>

          <div>
            <label
              htmlFor="reset-password"
              className="mb-1.5 block text-sm font-medium text-s-navy"
            >
              {t('newPassword')}
            </label>
            <div className="relative">
              <Input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border-s-border/80 pr-10 focus:border-brand-blue focus:ring-brand-blue/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-s-muted hover:text-s-navy"
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reset-confirm" className="mb-1.5 block text-sm font-medium text-s-navy">
              {t('confirmPassword')}
            </label>
            <Input
              id="reset-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="rounded-lg border-s-border/80 focus:border-brand-blue focus:ring-brand-blue/20"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full rounded-lg bg-brand-blue py-3 text-sm font-semibold text-white shadow-none hover:bg-brand-blue-hover"
            disabled={loading}
          >
            {loading ? t('resetting') : t('resetSubmit')}
          </Button>
        </form>
      ) : (
        <p className="text-center text-sm text-s-muted">{tc('loading')}</p>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  const tc = useTranslations('common');

  return (
    <Suspense fallback={<p className="text-center text-sm text-s-muted">{tc('loading')}</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
