'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { apiFetch, setToken } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

type InvitePreview = {
  email: string;
  name: string | null;
  role: string;
  organizationName: string;
};

export default function InviteAcceptClient() {
  const t = useTranslations('invite');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { refreshMe } = useAuth();

  const token = searchParams.get('token') ?? '';
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('missingToken'));
      return;
    }
    void apiFetch<InvitePreview>(`/auth/invite?token=${encodeURIComponent(token)}`, {
      skipAuth: true,
    })
      .then((data) => {
        setPreview(data);
        if (data.name) setName(data.name);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t('invalidInvite'));
      });
  }, [token, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPending(true);
    try {
      const res = await apiFetch<{ token: string }>('/auth/accept-invite', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ token, password, name: name.trim() || undefined }),
      });
      setToken(res.token);
      await refreshMe();
      toast.push(t('welcome'));
      router.replace('/dashboard');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-bold text-s-navy">{t('title')}</h1>
        {error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : preview ? (
          <>
            <p className="mt-2 text-sm text-s-muted">
              {t('intro', { org: preview.organizationName })}
            </p>
            <p className="mt-1 text-xs text-s-muted">
              {preview.email} · {preview.role === 'ADMIN' ? t('roleAdmin') : t('roleUser')}
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs text-s-muted">{t('yourName')}</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-xs text-s-muted">{t('choosePassword')}</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" variant="primary" className="w-full" disabled={pending}>
                {pending ? '…' : t('join')}
              </Button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-s-muted">…</p>
        )}
        <p className="mt-6 text-center text-xs text-s-muted">
          <Link href="/login">{t('alreadyAccount')}</Link>
        </p>
      </Card>
    </div>
  );
}
