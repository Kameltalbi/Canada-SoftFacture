'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  X,
  MessageCircle,
  FileText,
  Search,
  HelpCircle,
  ArrowRight,
  Mail,
  BookOpen,
  Sparkles,
  Zap,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'sf-visitor-assistant-dismissed';

export function VisitorAssistant() {
  const t = useTranslations('visitorAssistant');
  const [isOpen, setIsOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Animate bubble after 3 seconds on first visit
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed !== 'true') {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  // Widget ouvert
  if (isOpen) {
    return (
      <>
        {/* Panneau principal */}
        <div className="fixed bottom-24 right-6 z-50 w-[380px] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
            {/* Header violet avec onglets */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-4">
              {/* Onglets */}
              <div className="mb-4 flex items-center gap-1 rounded-full bg-white/10 p-1">
                <button className="flex-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white">
                  {t('tabs.messages')}
                </button>
                <button className="flex-1 rounded-full px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white">
                  {t('tabs.articles')}
                </button>
                <button className="flex-1 rounded-full px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white">
                  {t('tabs.search')}
                </button>
              </div>

              {/* Logo + titre */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{t('title')}</h3>
                  <p className="text-sm text-white/80">{t('subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Contenu */}
            <div className="bg-slate-50 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-700">{t('helpTitle')}</p>

              {/* Options cliquables */}
              <Link
                href="/register"
                onClick={() => localStorage.setItem(STORAGE_KEY, 'true')}
                className="mb-2 flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md hover:translate-x-1"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{t('options.firstInvoice')}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Link>

              <Link
                href="/tarifs"
                onClick={() => localStorage.setItem(STORAGE_KEY, 'true')}
                className="mb-2 flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md hover:translate-x-1"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{t('options.pricing')}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Link>

              <Link
                href="/help"
                onClick={() => localStorage.setItem(STORAGE_KEY, 'true')}
                className="mb-4 flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md hover:translate-x-1"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{t('options.helpCenter')}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Link>

              {/* Barre de recherche */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <Search className="h-4 w-4" />
                  <span className="text-sm">{t('search')}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{t('searchPlaceholder')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bouton fermer (X) en bas à droite */}
        <button
          onClick={handleDismiss}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-xl transition-all hover:scale-110 hover:bg-violet-700"
        >
          <X className="h-6 w-6" />
        </button>
      </>
    );
  }

  // Bouton bulle fermé
  return (
    <button
      onClick={toggleOpen}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300',
        'bg-violet-600 text-white hover:bg-violet-700 hover:scale-110 hover:shadow-2xl',
        hasAnimated && 'animate-in slide-in-from-bottom-4 fade-in bounce'
      )}
    >
      <MessageCircle className="h-7 w-7" />
    </button>
  );
}
