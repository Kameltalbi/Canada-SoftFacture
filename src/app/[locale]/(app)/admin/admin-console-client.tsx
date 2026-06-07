'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  CreditCard,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type SubscriptionPlan = 'STARTER' | 'PRO' | 'BUSINESS';
type BillingStatus = 'NONE' | 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE';
type BillingProvider = 'NONE' | 'STRIPE';
type UserRole = 'SUPERADMIN' | 'ADMIN' | 'USER';

type OrgCounts = {
  users: number;
  clients: number;
  invoices: number;
  quotes: number;
  products: number;
  payments: number;
};

type OrgRow = {
  id: string;
  name: string;
  billingEmail: string | null;
  billingLegalName: string | null;
  subscriptionPlan: SubscriptionPlan;
  pendingSubscriptionPlan: SubscriptionPlan | null;
  billingStatus: BillingStatus;
  billingProvider: BillingProvider;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: OrgCounts;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  organizationId: string | null;
  createdAt: string;
};

type OrgDetail = Omit<OrgRow, '_count'> & {
  users: (UserRow & { updatedAt: string })[];
  billingCheckoutSessions: {
    id: string;
    plan: SubscriptionPlan;
    status: string;
    provider: BillingProvider;
    providerSessionId: string | null;
    amountTtcCents: number;
    currency: string;
    createdAt: string;
    expiresAt: string | null;
  }[];
  _count: OrgCounts & { recurringInvoices: number; receivedInvoices: number };
};

const plans: SubscriptionPlan[] = ['STARTER', 'PRO', 'BUSINESS'];
const statuses: BillingStatus[] = ['NONE', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE'];
const roles: UserRole[] = ['SUPERADMIN', 'ADMIN', 'USER'];
const planMrrHt: Record<SubscriptionPlan, number> = { STARTER: 7.9, PRO: 12.9, BUSINESS: 17.9 };

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

function statusClass(status: BillingStatus) {
  return cn(
    'rounded-full px-2.5 py-1 text-xs font-bold',
    status === 'ACTIVE' && 'bg-emerald-100 text-emerald-800',
    status === 'TRIAL' && 'bg-blue-100 text-blue-800',
    status === 'PAST_DUE' && 'bg-amber-100 text-amber-800',
    status === 'CANCELED' && 'bg-red-100 text-red-800',
    status === 'INCOMPLETE' && 'bg-purple-100 text-purple-800',
    status === 'NONE' && 'bg-slate-100 text-slate-700'
  );
}

function infoClass(tone: 'default' | 'danger' = 'default') {
  return cn(
    'rounded-xl border p-3',
    tone === 'danger' ? 'border-red-200 bg-red-50' : 'border-s-border bg-slate-50'
  );
}

type SortField =
  | 'name'
  | 'subscriptionPlan'
  | 'billingStatus'
  | 'createdAt'
  | '_count.users'
  | '_count.invoices';
type SortDir = 'asc' | 'desc';

export default function AdminConsoleClient() {
  const { user, token } = useAuth();
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedOrgs, loadedUsers] = await Promise.all([
        apiFetch<OrgRow[]>('/superadmin/organizations'),
        apiFetch<UserRow[]>('/superadmin/users'),
      ]);
      setOrgs(loadedOrgs);
      setUsers(loadedUsers);
      setSelectedOrgId((current) => current ?? loadedOrgs[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (orgId: string) => {
    setDetail(await apiFetch<OrgDetail>(`/superadmin/organizations/${orgId}`));
  }, []);

  useEffect(() => {
    if (!token || user?.role !== 'SUPERADMIN') return;
    void load();
  }, [token, user?.role, load]);

  useEffect(() => {
    if (!selectedOrgId || user?.role !== 'SUPERADMIN') return;
    setDeleteConfirm('');
    void loadDetail(selectedOrgId).catch((e) =>
      setError(e instanceof Error ? e.message : 'Erreur détail organisation')
    );
  }, [selectedOrgId, user?.role, loadDetail]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function openSheet(orgId: string) {
    setSelectedOrgId(orgId);
    setSheetOpen(true);
    setMenuOpen(false);
  }

  function getOrgVal(org: OrgRow, field: SortField): string | number {
    if (field === '_count.users') return org._count.users;
    if (field === '_count.invoices') return org._count.invoices;
    return (org[field as keyof OrgRow] as string) ?? '';
  }

  const filteredOrgs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? orgs.filter((org) =>
          [org.name, org.billingEmail, org.billingLegalName, org.id].some((value) =>
            value?.toLowerCase().includes(q)
          )
        )
      : orgs;
    return [...filtered].sort((a, b) => {
      const av = getOrgVal(a, sortField);
      const bv = getOrgVal(b, sortField);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [orgs, query, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-slate-300" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-brand-blue" />
    ) : (
      <ChevronDown className="h-3 w-3 text-brand-blue" />
    );
  }

  const stats = useMemo(
    () => ({
      organizations: orgs.length,
      active: orgs.filter((org) => org.billingStatus === 'ACTIVE').length,
      trials: orgs.filter((org) => org.billingStatus === 'TRIAL').length,
      users: users.length,
      invoices: orgs.reduce((sum, org) => sum + org._count.invoices, 0),
      mrrHt: orgs.reduce(
        (sum, org) => sum + (org.billingStatus === 'ACTIVE' ? planMrrHt[org.subscriptionPlan] : 0),
        0
      ),
    }),
    [orgs, users]
  );

  async function refreshSelected() {
    await load();
    if (selectedOrgId) await loadDetail(selectedOrgId);
  }

  async function updateBilling(payload: Record<string, unknown>) {
    if (!detail) return;
    setBusy('billing');
    setError(null);
    try {
      await apiFetch(`/superadmin/organizations/${detail.id}/billing`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await refreshSelected();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur action abonnement');
    } finally {
      setBusy(null);
    }
  }

  async function extend(field: 'trialEndsAt' | 'currentPeriodEnd') {
    if (!detail) return;
    setBusy(field);
    setError(null);
    try {
      await apiFetch(`/superadmin/organizations/${detail.id}/extend`, {
        method: 'POST',
        body: JSON.stringify({ days: extendDays, field }),
      });
      await refreshSelected();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur prolongation');
    } finally {
      setBusy(null);
    }
  }

  async function updateUser(target: UserRow, payload: Record<string, unknown>) {
    setBusy(target.id);
    setError(null);
    try {
      await apiFetch(`/superadmin/users/${target.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (selectedOrgId) await loadDetail(selectedOrgId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur utilisateur');
    } finally {
      setBusy(null);
    }
  }

  async function deleteOrganization() {
    if (!detail) return;
    setBusy('delete');
    setError(null);
    try {
      await apiFetch(`/superadmin/organizations/${detail.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmName: deleteConfirm }),
      });
      setDetail(null);
      setSelectedOrgId(null);
      setDeleteConfirm('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setBusy(null);
    }
  }

  if (user?.role !== 'SUPERADMIN') {
    return (
      <Card className="border-amber-200 bg-amber-50 text-sm text-amber-900">
        Accès réservé au super-administrateur.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── En-tête ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase text-white">
            <Shield className="h-3.5 w-3.5" /> Console superadmin
          </p>
          <h1 className="mt-3 text-3xl font-bold text-s-navy">Pilotage SaaS SoftFacture</h1>
          <p className="text-s-muted">
            Organisations, abonnements, utilisateurs, risques paiement et actions
            d&apos;exploitation.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void load()} disabled={loading || Boolean(busy)}>
          <RefreshCw className="h-4 w-4" /> Actualiser
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50 text-sm text-red-800">
          <AlertTriangle className="me-2 inline h-4 w-4" /> {error}
        </Card>
      ) : null}

      {/* ── Stat cards ── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Organisations" value={stats.organizations} icon={Building2} />
        <StatCard title="Actives" value={stats.active} icon={CreditCard} />
        <StatCard title="Essais" value={stats.trials} icon={CalendarPlus} />
        <StatCard title="Utilisateurs" value={stats.users} icon={Users} />
        <StatCard title="Factures" value={stats.invoices} icon={CreditCard} />
        <StatCard
          title="MRR HT estimé"
          value={`${stats.mrrHt.toFixed(2).replace('.', ',')} €`}
          icon={CreditCard}
        />
      </div>

      {/* ── Tableau organisations ── */}
      <Card className="p-0">
        <div className="flex flex-col gap-3 border-b border-s-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Organisations ({filteredOrgs.length})</CardTitle>
          <div className="flex items-center gap-2 rounded-xl border border-s-border bg-white px-3 py-2 sm:w-80">
            <Search className="h-4 w-4 shrink-0 text-s-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher nom, email, ID…"
              className="w-full bg-transparent text-sm outline-none"
            />
            {query ? (
              <button onClick={() => setQuery('')} className="text-s-muted hover:text-slate-700">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s-border bg-slate-50 text-left text-xs uppercase text-s-muted">
                {(
                  [
                    ['name', 'Organisation'],
                    ['subscriptionPlan', 'Plan'],
                    ['billingStatus', 'Statut'],
                    ['_count.users', 'Users'],
                    ['_count.invoices', 'Factures'],
                    ['createdAt', 'Créée le'],
                  ] as [SortField, string][]
                ).map(([field, label]) => (
                  <th
                    key={field}
                    className="cursor-pointer select-none px-4 py-3 hover:text-slate-700"
                    onClick={() => toggleSort(field)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label} <SortIcon field={field} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-s-muted">
                    Chargement…
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-s-muted">
                    Aucune organisation trouvée.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() => openSheet(org.id)}
                    className="cursor-pointer border-b border-s-border/50 transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-s-navy">{org.name}</p>
                      <p className="text-xs text-s-muted">{org.billingEmail ?? org.id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                        {org.subscriptionPlan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusClass(org.billingStatus)}>{org.billingStatus}</span>
                    </td>
                    <td className="px-4 py-3 text-center">{org._count.users}</td>
                    <td className="px-4 py-3 text-center">{org._count.invoices}</td>
                    <td className="px-4 py-3 text-xs text-s-muted">{formatDate(org.createdAt)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative" ref={selectedOrgId === org.id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrgId(org.id);
                            setMenuOpen((v) => (selectedOrgId === org.id ? !v : true));
                          }}
                          className="rounded-lg p-1.5 hover:bg-slate-100"
                        >
                          <MoreVertical className="h-4 w-4 text-s-muted" />
                        </button>
                        {selectedOrgId === org.id && menuOpen ? (
                          <div className="absolute right-0 top-8 z-50 min-w-[180px] rounded-xl border border-s-border bg-white shadow-lg">
                            <button
                              type="button"
                              onClick={() => openSheet(org.id)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                            >
                              Ouvrir la fiche
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrgId(org.id);
                                void updateBilling({ billingStatus: 'ACTIVE' });
                                setMenuOpen(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                            >
                              Réactiver
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrgId(org.id);
                                void updateBilling({ billingStatus: 'CANCELED' });
                                setMenuOpen(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              Abroger
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Sheet / Drawer fiche organisation ── */}
      {sheetOpen ? (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col overflow-y-auto bg-white shadow-2xl">
            {/* Sheet header */}
            <div className="flex shrink-0 items-center justify-between border-b border-s-border px-6 py-4">
              <div>
                <p className="font-semibold text-s-navy">{detail?.name ?? '…'}</p>
                <p className="text-xs text-s-muted">{detail?.billingEmail ?? detail?.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {detail ? (
                  <span className={statusClass(detail.billingStatus)}>{detail.billingStatus}</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {!detail ? (
              <div className="p-8 text-center text-sm text-s-muted">Chargement…</div>
            ) : (
              <div className="flex-1 space-y-6 p-6">
                {/* Infos générales */}
                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-s-muted">Informations</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Info label="Raison sociale" value={detail.billingLegalName ?? '—'} />
                    <Info label="Plan" value={detail.subscriptionPlan} />
                    <Info label="Provider" value={detail.billingProvider} />
                    <Info label="Fin essai" value={formatDate(detail.trialEndsAt)} />
                    <Info label="Fin période" value={formatDate(detail.currentPeriodEnd)} />
                    <Info label="Onboarding" value={formatDate(detail.onboardingCompletedAt)} />
                  </div>
                  <p className="mt-2 font-mono text-xs text-slate-400">{detail.id}</p>
                </div>

                {/* Métriques */}
                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-s-muted">Métriques</p>
                  <div className="grid grid-cols-4 gap-2">
                    <Info label="Users" value={String(detail._count.users)} />
                    <Info label="Clients" value={String(detail._count.clients)} />
                    <Info label="Factures" value={String(detail._count.invoices)} />
                    <Info label="Devis" value={String(detail._count.quotes)} />
                    <Info label="Produits" value={String(detail._count.products)} />
                    <Info label="Paiements" value={String(detail._count.payments)} />
                    <Info label="Récurrentes" value={String(detail._count.recurringInvoices)} />
                    <Info label="Reçues" value={String(detail._count.receivedInvoices)} />
                  </div>
                </div>

                {/* Abonnement */}
                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-s-muted">Abonnement</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-medium">
                      Plan
                      <select
                        value={detail.subscriptionPlan}
                        onChange={(e) => void updateBilling({ subscriptionPlan: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-s-border px-3 py-2"
                      >
                        {plans.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Statut
                      <select
                        value={detail.billingStatus}
                        onChange={(e) => void updateBilling({ billingStatus: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-s-border px-3 py-2"
                      >
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Jours à prolonger
                      <input
                        type="number"
                        min={1}
                        max={730}
                        value={extendDays}
                        onChange={(e) => setExtendDays(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-s-border px-3 py-2"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void extend('trialEndsAt')}
                      disabled={Boolean(busy)}
                    >
                      <CalendarPlus className="h-4 w-4" /> Prolonger essai
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void extend('currentPeriodEnd')}
                      disabled={Boolean(busy)}
                    >
                      <CalendarPlus className="h-4 w-4" /> Prolonger abonnement
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void updateBilling({ billingStatus: 'CANCELED' })}
                      disabled={Boolean(busy)}
                    >
                      Abroger
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void updateBilling({ billingStatus: 'ACTIVE' })}
                      disabled={Boolean(busy)}
                    >
                      Réactiver
                    </Button>
                    {detail.stripeSubscriptionId ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void updateBilling({ clearStripeSubscription: true })}
                        disabled={Boolean(busy)}
                      >
                        Détacher Stripe
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Utilisateurs */}
                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-s-muted">Utilisateurs</p>
                  <div className="overflow-x-auto rounded-xl border border-s-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left text-xs uppercase text-s-muted">
                          <th className="px-4 py-2">Utilisateur</th>
                          <th className="px-4 py-2">Rôle</th>
                          <th className="px-4 py-2">Statut</th>
                          <th className="px-4 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.users.map((orgUser) => (
                          <tr
                            key={orgUser.id}
                            className="border-b border-s-border/50 last:border-0"
                          >
                            <td className="px-4 py-2.5">
                              <p className="font-medium">{orgUser.name ?? '—'}</p>
                              <p className="text-xs text-s-muted">{orgUser.email}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                value={orgUser.role}
                                onChange={(e) => void updateUser(orgUser, { role: e.target.value })}
                                className="rounded border px-2 py-1 text-xs"
                              >
                                {roles.map((r) => (
                                  <option key={r}>{r}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2.5 text-xs">
                              {orgUser.isActive ? 'Actif' : 'Suspendu'}
                            </td>
                            <td className="px-4 py-2.5">
                              <Button
                                size="sm"
                                variant={orgUser.isActive ? 'danger' : 'secondary'}
                                onClick={() =>
                                  void updateUser(orgUser, { isActive: !orgUser.isActive })
                                }
                              >
                                {orgUser.isActive ? 'Suspendre' : 'Réactiver'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Sessions checkout */}
                <div>
                  <p className="mb-3 text-xs font-bold uppercase text-s-muted">Sessions checkout</p>
                  {detail.billingCheckoutSessions.length === 0 ? (
                    <p className="text-sm text-s-muted">Aucune session.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.billingCheckoutSessions.map((session) => (
                        <div
                          key={session.id}
                          className="rounded-xl border border-s-border p-3 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold">
                              {session.plan} · {session.status}
                            </p>
                            <p className="text-s-muted">
                              {(session.amountTtcCents / 100).toFixed(2)} {session.currency}
                            </p>
                          </div>
                          <p className="mt-1 font-mono text-xs text-slate-400">
                            {session.providerSessionId ?? session.id}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Zone dangereuse */}
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                  <p className="font-semibold text-red-900">Zone dangereuse</p>
                  <p className="mt-1 text-sm text-red-800">
                    La suppression efface l&apos;organisation et toutes ses données.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder={`Tapez : ${detail.name}`}
                      className="flex-1 rounded-lg border border-red-200 px-3 py-2 text-sm"
                    />
                    <Button
                      variant="danger"
                      onClick={() => void deleteOrganization()}
                      disabled={deleteConfirm !== detail.name || Boolean(busy)}
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Info({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className={infoClass(tone)}>
      <p className="text-xs font-bold uppercase text-s-muted">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-s-navy">{value}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  icon: typeof Building2;
}) {
  return (
    <Card className="p-4">
      <Icon className="h-5 w-5 text-brand" />
      <p className="mt-3 text-xs font-bold uppercase text-s-muted">{title}</p>
      <p className="text-2xl font-bold text-s-navy">{value}</p>
    </Card>
  );
}
