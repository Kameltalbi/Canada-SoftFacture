'use client';

import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';

/** Déconnexion + redirection vers /login sans rechargement complet (évite les erreurs réseau en dev). */
export function useLogout() {
  const { logout } = useAuth();
  const router = useRouter();

  return useCallback(() => {
    logout();
    router.replace('/login');
  }, [logout, router]);
}
