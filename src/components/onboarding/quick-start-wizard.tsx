'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  X,
  Sparkles,
  ArrowRight,
  Check,
  User,
  Package,
  FileText,
  Building2,
  UserCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'sf-quick-wizard-dismissed';

type Step = 'clientType' | 'client' | 'product' | 'invoice' | 'done';

export function QuickStartWizard() {
  const t = useTranslations('quickWizard');
  const tc = useTranslations('common');
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== 'true';
  });

  const [step, setStep] = useState<Step>('clientType');
  const [loading, setLoading] = useState(false);

  // Form states
  const [isMicroEntrepreneur, setIsMicroEntrepreneur] = useState<boolean | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  if (!open) return null;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  const handleSetMicroEntrepreneur = async (isMicro: boolean) => {
    setIsMicroEntrepreneur(isMicro);
    setLoading(true);
    try {
      // Mettre à jour l'organisation
      await apiFetch('/organizations', {
        method: 'PATCH',
        body: JSON.stringify({
          isMicroEntrepreneur: isMicro,
        }),
      });
      setStep('client');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!clientName.trim()) {
      toast.push(t('errors.clientName'), 'error');
      return;
    }
    setLoading(true);
    try {
      const client = await apiFetch<{ id: string }>('/clients', {
        method: 'POST',
        body: JSON.stringify({
          name: clientName.trim(),
          email: clientEmail.trim() || null,
        }),
      });
      setClientId(client.id);
      setStep('product');
      toast.push(t('clientCreated'), 'success');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!productName.trim() || !productPrice.trim()) {
      toast.push(t('errors.product'), 'error');
      return;
    }
    const price = parseFloat(productPrice);
    if (isNaN(price) || price <= 0) {
      toast.push(t('errors.price'), 'error');
      return;
    }
    if (!clientId) {
      toast.push('Client non créé', 'error');
      return;
    }

    setLoading(true);
    try {
      const inv = await apiFetch<{ id: string }>('/invoices', {
        method: 'POST',
        body: JSON.stringify({
          clientId: clientId,
          lines: [
            {
              description: productName.trim(),
              quantity: 1,
              unitPriceHt: price,
              taxRate: 20,
            },
          ],
        }),
      });
      setInvoiceId(inv.id);
      setStep('done');
      toast.push(t('invoiceCreated'), 'success');
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 'clientType', icon: Building2, label: t('steps.clientType') },
    { id: 'client', icon: User, label: t('steps.client') },
    { id: 'product', icon: Package, label: t('steps.product') },
    { id: 'invoice', icon: FileText, label: t('steps.invoice') },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] px-6 py-4">
            <div className="flex items-center gap-3 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{t('title')}</h3>
                <p className="text-xs text-white/80">{t('subtitle')}</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="rounded p-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-3">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = steps.findIndex((x) => x.id === step) > idx;

              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                      isActive && 'bg-[#1e3a8a] text-white',
                      isDone && 'bg-green-500 text-white',
                      !isActive && !isDone && 'bg-slate-200 text-slate-500'
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={cn(
                      'hidden text-xs sm:block',
                      isActive ? 'font-medium text-slate-900' : 'text-slate-500'
                    )}
                  >
                    {s.label}
                  </span>
                  {idx < steps.length - 1 && <ArrowRight className="mx-1 h-4 w-4 text-slate-300" />}
                </div>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'clientType' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{t('clientTypeDesc')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => void handleSetMicroEntrepreneur(true)}
                    disabled={loading}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                      isMicroEntrepreneur === true
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
                    )}
                  >
                    <UserCircle className="h-8 w-8 text-green-600" />
                    <span className="text-sm font-medium text-slate-700">
                      {t('microEntrepreneur')}
                    </span>
                  </button>
                  <button
                    onClick={() => void handleSetMicroEntrepreneur(false)}
                    disabled={loading}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                      isMicroEntrepreneur === false
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    )}
                  >
                    <Building2 className="h-8 w-8 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">{t('entreprise')}</span>
                  </button>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={handleDismiss} className="flex-1">
                    {tc('cancel')}
                  </Button>
                </div>
              </div>
            )}

            {step === 'client' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{t('clientDesc')}</p>
                <Input
                  placeholder={t('clientNamePlaceholder')}
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  autoFocus
                />
                <Input
                  placeholder={t('clientEmailPlaceholder')}
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={handleDismiss} className="flex-1">
                    {tc('cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => void handleCreateClient()}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? tc('loading') : t('next')}
                  </Button>
                </div>
              </div>
            )}

            {step === 'product' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{t('productDesc')}</p>
                <Input
                  placeholder={t('productNamePlaceholder')}
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  autoFocus
                />
                <Input
                  placeholder={t('productPricePlaceholder')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                />
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setStep('client')} className="flex-1">
                    {t('back')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setStep('invoice')}
                    disabled={loading}
                    className="flex-1"
                  >
                    {t('next')}
                  </Button>
                </div>
              </div>
            )}

            {step === 'invoice' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{t('invoiceDesc')}</p>
                <div className="rounded-lg bg-slate-50 p-4 text-sm">
                  <p>
                    <strong>{t('client')}:</strong> {clientName}
                  </p>
                  <p>
                    <strong>{t('product')}:</strong> {productName}
                  </p>
                  <p>
                    <strong>{t('amount')}:</strong> {productPrice} € HT
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setStep('product')} className="flex-1">
                    {t('back')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => void handleCreateInvoice()}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? tc('loading') : t('createInvoice')}
                  </Button>
                </div>
              </div>
            )}

            {step === 'done' && invoiceId && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900">{t('doneTitle')}</h4>
                <p className="text-sm text-slate-600">{t('doneDesc')}</p>
                <div className="flex gap-2 pt-2">
                  <Button variant="ghost" onClick={handleDismiss} className="flex-1">
                    {t('close')}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => router.push(`/invoices/${invoiceId}`)}
                    className="flex-1"
                  >
                    {t('viewInvoice')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
