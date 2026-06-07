'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle,
  User,
  Building2,
  Image,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type CheckItem = {
  id: string;
  label: string;
  done: boolean;
  link: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
};

type OrgData = {
  logoUrl?: string | null;
  taxMatricule?: string | null;
  name?: string;
  address?: string | null;
  city?: string | null;
  clientsCount?: number;
  productsCount?: number;
  invoicesCount?: number;
};

const STORAGE_KEY = 'sf-assistant-dismissed';
const POPUP_SHOWN_KEY = 'sf-assistant-popups-shown';

export function OnboardingAssistant() {
  const t = useTranslations('assistant');
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(true);
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const orgId = user?.organizationId;

  const loadOrg = useCallback(async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const data = await apiFetch<OrgData>(`/organizations`);
      setOrg(data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (orgId) void loadOrg();
  }, [orgId, loadOrg]);

  // Check items based on org data
  const checks: CheckItem[] = [
    {
      id: 'profile',
      label: t('checks.profile'),
      done: Boolean(user?.name?.trim()),
      link: '/settings?s=entreprise',
      icon: <User className="h-4 w-4" />,
      priority: 'medium',
    },
    {
      id: 'company',
      label: t('checks.company'),
      done: Boolean(org?.name?.trim() && org?.address?.trim() && org?.city?.trim()),
      link: '/settings?s=entreprise',
      icon: <Building2 className="h-4 w-4" />,
      priority: 'high',
    },
    {
      id: 'siret',
      label: t('checks.siret'),
      done: Boolean(org?.taxMatricule?.trim()),
      link: '/settings?s=entreprise',
      icon: <FileText className="h-4 w-4" />,
      priority: 'high',
    },
    {
      id: 'logo',
      label: t('checks.logo'),
      done: Boolean(org?.logoUrl),
      link: '/settings?s=logo',
      icon: <Image className="h-4 w-4" />,
      priority: 'medium',
    },
    {
      id: 'legal',
      label: t('checks.legal'),
      done: Boolean(org?.taxMatricule?.trim()), // Simplified check
      link: '/settings?s=pied',
      icon: <FileText className="h-4 w-4" />,
      priority: 'medium',
    },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  const totalCount = checks.length;
  const progressPct = Math.round((doneCount / totalCount) * 100);
  const highPriorityMissing = checks.filter((c) => !c.done && c.priority === 'high');

  // Show contextual popups for high priority missing items
  useEffect(() => {
    if (!org || !isAdmin) return;

    const shownPopups = JSON.parse(localStorage.getItem(POPUP_SHOWN_KEY) || '[]') as string[];

    // Show SIRET popup if missing and not shown
    if (!org.taxMatricule && !shownPopups.includes('siret')) {
      setTimeout(() => {
        toast.push(t('popups.siret'), 'error');
        localStorage.setItem(POPUP_SHOWN_KEY, JSON.stringify([...shownPopups, 'siret']));
      }, 3000);
    }

    // Show logo popup if missing and not shown (after 30 seconds)
    if (!org.logoUrl && !shownPopups.includes('logo')) {
      setTimeout(() => {
        toast.push(t('popups.logo'), 'success');
        localStorage.setItem(POPUP_SHOWN_KEY, JSON.stringify([...shownPopups, 'logo']));
      }, 30000);
    }
  }, [org, isAdmin, toast, t]);

  // Don't show if dismissed or onboarding not complete
  const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
  const onboardingComplete = Boolean(user?.organization?.onboardingCompletedAt);

  if (!isAdmin || !onboardingComplete || isDismissed) {
    return null;
  }

  const allDone = doneCount === totalCount;

  if (allDone) {
    return (
      <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-500">
        <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm text-green-700 shadow-lg ring-1 ring-green-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>{t('allDone')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Minimized bubble */}
      {minimized && (
        <button
          onClick={() => setMinimized(false)}
          className={cn(
            'group flex items-center gap-3 rounded-full px-4 py-3 shadow-xl transition-all',
            'bg-[#1e3a8a] text-white hover:bg-[#1e40af] hover:shadow-2xl',
            'animate-in slide-in-from-bottom-4 fade-in duration-300'
          )}
        >
          <div className="relative">
            <HelpCircle className="h-5 w-5" />
            {highPriorityMissing.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
                {highPriorityMissing.length}
              </span>
            )}
          </div>
          <span className="text-sm font-medium">{t('help')}</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
            {doneCount}/{totalCount}
          </span>
        </button>
      )}

      {/* Expanded panel */}
      {!minimized && (
        <div className="w-80 animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] px-4 py-3">
              <div className="flex items-center gap-2 text-white">
                <HelpCircle className="h-5 w-5" />
                <span className="font-semibold">{t('title')}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMinimized(true)}
                  className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <span className="text-xs">−</span>
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem(STORAGE_KEY, 'true');
                    setMinimized(true);
                  }}
                  className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">{t('progress')}</span>
                <span className="font-semibold text-[#1e3a8a]">{progressPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="max-h-72 overflow-y-auto p-2">
              {checks.map((check) => (
                <button
                  key={check.id}
                  onClick={() => {
                    router.push(check.link);
                    setMinimized(true);
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    'hover:bg-slate-50',
                    check.done ? 'opacity-60' : 'opacity-100',
                    !check.done && check.priority === 'high' && 'bg-red-50/50'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      check.done
                        ? 'bg-green-100 text-green-600'
                        : check.priority === 'high'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {check.done ? <CheckCircle2 className="h-4 w-4" /> : check.icon}
                  </div>
                  <div className="flex-1">
                    <p
                      className={cn(
                        'text-sm',
                        check.done ? 'text-slate-500 line-through' : 'text-slate-700'
                      )}
                    >
                      {check.label}
                    </p>
                    {!check.done && check.priority === 'high' && (
                      <p className="mt-0.5 text-[10px] text-red-500">{t('priorityHigh')}</p>
                    )}
                  </div>
                  {!check.done && <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 bg-slate-50 p-3">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => {
                  const firstMissing = checks.find((c) => !c.done);
                  if (firstMissing) {
                    router.push(firstMissing.link);
                    setMinimized(true);
                  }
                }}
              >
                {t('complete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
