'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';

const STORAGE_KEY = 'softfacture_cookie_consent';
const CONSENT_MAX_AGE_MS = 13 * 30 * 24 * 60 * 60 * 1000; // 13 mois (Loi 25)

interface StoredConsent {
  decided: boolean;
  decidedAt: number;
  essential: true;
}

function isConsentValid(stored: StoredConsent): boolean {
  if (!stored.decided) return false;
  const age = Date.now() - (stored.decidedAt ?? 0);
  return age < CONSENT_MAX_AGE_MS;
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function check() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: StoredConsent = JSON.parse(raw);
          if (isConsentValid(parsed)) return;
        }
      } catch {}
      setVisible(true);
    }

    check();

    // Écouter l'event de réouverture depuis le footer
    window.addEventListener('softfacture:reopen-cookies', () => setVisible(true));
    return () => window.removeEventListener('softfacture:reopen-cookies', () => setVisible(true));
  }, []);

  function save(accepted: boolean) {
    try {
      const consent: StoredConsent = { decided: true, decidedAt: Date.now(), essential: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...consent, accepted }));
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Consentement aux cookies"
      className="fixed bottom-5 left-5 z-[9999] w-[320px] rounded-xl bg-white text-slate-800"
      style={{ boxShadow: '0 8px 40px rgba(15,23,42,.18)', border: '1px solid #E2E8F0' }}
    >
      {/* Croix — équivaut à Refuser (Loi 25 : pas de consentement implicite) */}
      <button
        type="button"
        onClick={() => save(false)}
        aria-label="Fermer sans accepter"
        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Contenu */}
      <div className="p-5 pr-10">
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#0B1F52]">
          Vos préférences de confidentialité
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          Ce site utilise uniquement des cookies essentiels au fonctionnement du service
          (authentification, session). Aucun cookie publicitaire ou de traçage tiers n&apos;est
          utilisé. Pour en savoir plus, consultez notre{' '}
          <Link
            href="/politique-de-confidentialite"
            className="font-medium text-[#0B1F52] underline decoration-slate-300 hover:decoration-[#0B1F52]"
          >
            politique de confidentialité
          </Link>
          .
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Votre choix est mémorisé pendant 13 mois, conformément à la Loi 25 (Québec).
        </p>

        {/* Boutons */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => save(true)}
            className="flex-1 rounded-lg py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: '#10B981' }}
          >
            Accepter
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            className="flex-1 rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
}
