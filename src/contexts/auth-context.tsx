'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, clearToken, getToken, setToken } from '@/lib/api-client';

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'USER';

export type ApiOrganization = {
  id: string;
  name: string;
  logoUrl: string | null;
  taxMatricule: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  defaultCurrency: string;
  defaultVatRate: unknown;
  invoicePrefix?: string;
  quotePrefix?: string;
  invoiceSequence?: number;
  quoteSequence?: number;
  lastInvoiceYear?: number;
  lastQuoteYear?: number;
  invoiceNumberFormat?: string;
  quoteNumberFormat?: string;
  depositNumberFormat?: string;
  invoiceResetYearly?: boolean;
  quoteResetYearly?: boolean;
  depositResetYearly?: boolean;
  depositPrefix?: string;
  depositSequence?: number;
  lastDepositYear?: number;
  onboardingCompletedAt?: string | null;
  subscriptionPlan?: string;
  billingStatus?: string;
  trialEndsAt?: string | null;
  billingSiret?: string | null;
  billingLegalName?: string | null;
  billingEmail?: string | null;
  vatOnDebitsEnabled?: boolean;
  stockManagementEnabled?: boolean;
  paProvider?: string;
  paAccountRef?: string | null;
  paConnectedAt?: string | null;
};

export type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  role: UserRole;
  isActive?: boolean;
  organizationId: string | null;
  organization?: ApiOrganization | null;
};

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: ApiUser | null;
  token: string | null;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    phone: string;
    acceptTerms?: boolean;
  }) => Promise<ApiUser>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('unauthenticated');
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  /** Invalide les réponses async du bootstrap si login/logout entre-temps. */
  const authEpochRef = useRef(0);

  const applySession = useCallback(
    (epoch: number, next: { status: AuthStatus; user: ApiUser | null; token: string | null }) => {
      if (epoch !== authEpochRef.current) return false;
      setStatus(next.status);
      setUser(next.user);
      setTokenState(next.token);
      setIsReady(true);
      return true;
    },
    []
  );

  const refreshMe = useCallback(async () => {
    const epoch = authEpochRef.current;
    const t = getToken();
    if (!t) {
      applySession(epoch, { status: 'unauthenticated', user: null, token: null });
      return;
    }
    try {
      const me = await apiFetch<ApiUser>('/auth/me');
      applySession(epoch, { status: 'authenticated', user: me, token: t });
    } catch {
      if (epoch !== authEpochRef.current) return;
      clearToken();
      applySession(epoch, { status: 'unauthenticated', user: null, token: null });
    }
  }, [applySession]);

  useEffect(() => {
    const epoch = authEpochRef.current;

    async function bootstrap() {
      const t = getToken();
      if (!t) {
        applySession(epoch, { status: 'unauthenticated', user: null, token: null });
        return;
      }

      try {
        const me = await apiFetch<ApiUser>('/auth/me');
        applySession(epoch, { status: 'authenticated', user: me, token: t });
      } catch {
        if (epoch !== authEpochRef.current) return;
        clearToken();
        applySession(epoch, { status: 'unauthenticated', user: null, token: null });
      }
    }

    void bootstrap();
  }, [applySession]);

  const login = useCallback(
    async (email: string, password: string) => {
      authEpochRef.current += 1;
      const epoch = authEpochRef.current;
      const res = await apiFetch<{ token: string; user: ApiUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        skipAuth: true,
      });
      setToken(res.token);
      const me = await apiFetch<ApiUser>('/auth/me');
      applySession(epoch, { status: 'authenticated', user: me, token: res.token });
      return me;
    },
    [applySession]
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organizationName: string;
      phone: string;
    }) => {
      authEpochRef.current += 1;
      const epoch = authEpochRef.current;
      const res = await apiFetch<{ token: string; user: ApiUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
        skipAuth: true,
      });
      setToken(res.token);
      const me = await apiFetch<ApiUser>('/auth/me');
      applySession(epoch, { status: 'authenticated', user: me, token: res.token });
      return me;
    },
    [applySession]
  );

  const logout = useCallback(() => {
    authEpochRef.current += 1;
    clearToken();
    setStatus('unauthenticated');
    setUser(null);
    setTokenState(null);
    setIsReady(true);
  }, []);

  const resolvedStatus: AuthStatus = isReady ? status : 'loading';

  const value = useMemo(
    () => ({
      status: resolvedStatus,
      user,
      token,
      login,
      register,
      logout,
      refreshMe,
    }),
    [resolvedStatus, user, token, login, register, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
