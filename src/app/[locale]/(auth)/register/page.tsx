'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { isPlanId } from '@/lib/pricing-plans';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Eye, EyeOff } from 'lucide-react';

function RegisterContent() {
  const t = useTranslations('auth');
  const navT = useTranslations('nav');
  const tc = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (phone.trim().length < 8) {
      toast.push(t('phoneInvalid'), 'error');
      return;
    }

    setPending(true);

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        organizationName: companyName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      toast.push(t('welcome'));

      const plan = searchParams.get('plan');

      if (isPlanId(plan)) {
        router.replace(`/checkout?plan=${plan}`);
      } else {
        router.replace('/dashboard');
      }
    } catch (er: unknown) {
      const msg = er instanceof Error ? er.message : tc('error');
      toast.push(msg, 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-s-border/80 shadow-2xl">
      <div className="mb-6 flex items-center justify-between">
        <CardTitle>{t('registerTitle')}</CardTitle>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-s-muted">{t('firstName')}</label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-s-muted">{t('lastName')}</label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-s-muted">{t('companyName')}</label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-s-muted">{t('email')}</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-s-muted">{t('phone')}</label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-s-muted">{t('password')}</label>

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="pr-10"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-s-muted hover:text-s-navy"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <p className="text-xs text-s-muted">{t('registerAdminNote')}</p>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? '…' : t('submitRegister')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-s-muted">
        {t('hasAccount')}{' '}
        <Link href="/login" className="font-medium text-s-accent hover:underline">
          {navT('login')}
        </Link>
      </p>

      <p className="mt-4 text-center">
        <Link href="/" className="text-xs text-s-muted hover:text-s-navy">
          ← {tc('back')}
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
