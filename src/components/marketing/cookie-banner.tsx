'use client';

import { useState, useEffect } from 'react';
import { X, Globe, Settings } from 'lucide-react';
import Link from 'next/link';

type CookieCategory = 'performance' | 'targeting' | 'functional' | 'unclassified';

const STORAGE_KEY = 'softfacture_cookie_consent';

interface ConsentState {
  decided: boolean;
  performance: boolean;
  targeting: boolean;
  functional: boolean;
  unclassified: boolean;
}

const defaultConsent: ConsentState = {
  decided: false,
  performance: false,
  targeting: false,
  functional: false,
  unclassified: false,
};

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(defaultConsent);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ConsentState = JSON.parse(stored);
        if (parsed.decided) return;
      }
    } catch {}
    setVisible(true);
  }, []);

  function save(state: ConsentState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, decided: true }));
    } catch {}
    setVisible(false);
  }

  function acceptAll() {
    save({
      decided: true,
      performance: true,
      targeting: true,
      functional: true,
      unclassified: true,
    });
  }

  function rejectAll() {
    save({
      decided: true,
      performance: false,
      targeting: false,
      functional: false,
      unclassified: false,
    });
  }

  function saveCustom() {
    save({ ...consent, decided: true });
  }

  function toggle(cat: CookieCategory) {
    setConsent((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  if (!visible) return null;

  const categories: { id: CookieCategory; label: string }[] = [
    { id: 'performance', label: 'Performance' },
    { id: 'targeting', label: 'Ciblage' },
    { id: 'functional', label: 'Fonctionnalité' },
    { id: 'unclassified', label: 'Non classifiés' },
  ];

  return (
    <div
      role="dialog"
      aria-label="Consentement aux cookies"
      className="fixed inset-x-0 bottom-0 z-[9999] border-t border-slate-700 bg-slate-900 text-white shadow-2xl"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-8">
        {/* Row principale */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
          {/* Icône globe */}
          <div className="hidden shrink-0 lg:flex">
            <Globe className="mt-1 h-5 w-5 text-slate-400" />
          </div>

          {/* Texte */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Ce site Web utilise des cookies</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Notre site Web utilise des cookies pour améliorer l&apos;expérience utilisateur. En
              utilisant notre site Web, vous acceptez tous les cookies conformément à notre
              Politique relative aux cookies.{' '}
              <Link
                href="/politique-de-confidentialite"
                className="text-emerald-400 hover:underline"
              >
                En savoir plus
              </Link>
            </p>

            {/* Catégories */}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              {/* Strictement nécessaires — toujours coché */}
              <label className="flex cursor-not-allowed items-center gap-1.5 text-xs font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked
                  disabled
                  className="h-3.5 w-3.5 accent-emerald-500"
                />
                Strictement nécessaires
              </label>

              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={consent[cat.id]}
                    onChange={() => toggle(cat.id)}
                    className="h-3.5 w-3.5 accent-emerald-500"
                  />
                  {cat.label}
                </label>
              ))}
            </div>

            {/* Afficher les détails */}
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white"
            >
              <Settings className="h-3.5 w-3.5" />
              {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
            </button>

            {/* Détails expandables */}
            {showDetails && (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800 p-4 text-xs text-slate-300 space-y-2">
                <p>
                  <span className="font-semibold text-white">Strictement nécessaires :</span> Ces
                  cookies sont indispensables au fonctionnement du site et ne peuvent pas être
                  désactivés.
                </p>
                <p>
                  <span className="font-semibold text-white">Performance :</span> Ces cookies nous
                  permettent de mesurer le trafic et les performances du site afin d&apos;améliorer
                  votre expérience.
                </p>
                <p>
                  <span className="font-semibold text-white">Ciblage :</span> Ces cookies peuvent
                  être utilisés par nos partenaires publicitaires pour vous proposer des contenus
                  personnalisés.
                </p>
                <p>
                  <span className="font-semibold text-white">Fonctionnalité :</span> Ces cookies
                  permettent au site de fournir des fonctionnalités avancées et de mémoriser vos
                  préférences.
                </p>
                <p>
                  <span className="font-semibold text-white">Non classifiés :</span> Cookies en
                  cours de classification.
                </p>
                <button
                  onClick={saveCustom}
                  className="mt-2 rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600"
                >
                  Enregistrer mes préférences
                </button>
              </div>
            )}
          </div>

          {/* Boutons d'action */}
          <div className="flex shrink-0 items-center gap-3 self-start lg:self-center">
            <button
              onClick={acceptAll}
              className="rounded bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-emerald-500 whitespace-nowrap"
            >
              ACCEPTER TOUT
            </button>
            <button
              onClick={rejectAll}
              className="rounded border border-slate-500 bg-transparent px-5 py-2 text-sm font-bold text-white hover:border-slate-300 whitespace-nowrap"
            >
              REFUSER TOUT
            </button>
            <button
              onClick={rejectAll}
              aria-label="Fermer"
              className="ml-1 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
