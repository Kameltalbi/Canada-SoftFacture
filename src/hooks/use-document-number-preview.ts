'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';

type DocumentNumberType = 'invoice' | 'quote' | 'deposit';

type PreviewResponse = {
  nextNumber: string;
};

/** Prochain numéro calculé côté serveur (compteur à jour). */
export function useDocumentNumberPreview(
  type: DocumentNumberType,
  issueDate: string,
  enabled = true
) {
  const { token } = useAuth();
  const [nextNumber, setNextNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !enabled) {
      setNextNumber(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const iso = new Date(issueDate).toISOString();
    void apiFetch<PreviewResponse>(
      `/organizations/numbering/preview?type=${type}&issueDate=${encodeURIComponent(iso)}`
    )
      .then((res) => {
        if (!cancelled) setNextNumber(res.nextNumber);
      })
      .catch(() => {
        if (!cancelled) setNextNumber(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, type, issueDate, enabled]);

  return { nextNumber, loading };
}
