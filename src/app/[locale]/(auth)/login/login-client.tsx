'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { BrandWordmark } from '@/components/brand/brand-wordmark';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

function readReturnUrl(): string | null {
  const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
  if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) return returnUrl;
  return null;
}

function loginRedirectPath(role: string, returnUrl: string | null): string {
  if (role === 'SUPERADMIN') return '/admin';
  if (returnUrl) return returnUrl;
  return '/dashboard';
}

const cardClassName =
  'rounded-2xl border border-s-border/60 bg-white px-8 py-10 shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:px-10';

export default function LoginClient() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErr(t('fillAllFields'));
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const user = await login(trimmedEmail, password);
      const target = loginRedirectPath(user.role, readReturnUrl());
      window.location.assign(target);
    } catch (ex: unknown) {
      const msg = ex instanceof Error ? ex.message : '';
      const isUnreachableApi = ex instanceof TypeError || msg === 'Failed to fetch';
      setErr(
        isUnreachableApi ? t('loginNetworkError') : ex instanceof Error ? ex.message : tc('error')
      );
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
        <h1 className="text-xl font-bold text-s-navy">{t('loginTitle')}</h1>
        <p className="mt-1.5 text-sm text-s-muted">{t('loginSubtitle')}</p>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-s-navy">
            {t('email')}
          </label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={t('email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border-s-border/80 focus:border-brand-blue focus:ring-brand-blue/20"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-s-navy">
            {t('password')}
          </label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('password')}
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
          <div className="mt-2 text-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-brand-blue hover:text-brand-blue-hover hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          </div>
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
          {loading ? t('submittingLogin') : t('submitLogin')}
        </Button>
      </form>

      <div className="mt-8 space-y-3 text-center">
        <p>
          <Link
            href="/register"
            className="text-sm font-semibold text-brand hover:text-brand-hover hover:underline"
          >
            {t('createAccount')}
          </Link>
        </p>
        <p className="text-xs leading-relaxed text-brand-blue">{t('freePlanHint')}</p>
        <p className="text-xs text-s-muted">{t('orSeparator')}</p>
        <p>
          <Link
            href="/tarifs"
            className="text-sm font-medium text-brand-blue hover:text-brand-blue-hover hover:underline"
          >
            {t('viewPaidPlans')}
          </Link>
        </p>
        <p className="pt-2">
          <Link href="/" className="text-xs text-s-muted hover:text-s-navy hover:underline">
            {t('backHome')}
          </Link>
        </p>
      </div>
    </div>
  );
}
