'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Mail, UserPlus, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

type OrgUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

type PendingInvite = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  expiresAt: string;
};

type SeatsInfo = {
  plan: string;
  max: number;
  used: number;
  remaining: number;
  canAdd: boolean;
  activeUsers: number;
  pendingInvites: number;
};

type Props = {
  readOnly: boolean;
};

export function UsersSection({ readOnly }: Props) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const toast = useToast();
  const { user: me } = useAuth();

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [seats, setSeats] = useState<SeatsInfo | null>(null);
  const [mode, setMode] = useState<'list' | 'create' | 'invite'>('list');
  const [pending, setPending] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'ADMIN' | 'USER',
  });
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'USER' as 'ADMIN' | 'USER',
  });

  const load = useCallback(async () => {
    const [u, inv, s] = await Promise.all([
      apiFetch<OrgUser[]>('/organizations/users'),
      apiFetch<PendingInvite[]>('/organizations/users/invitations'),
      apiFetch<SeatsInfo>('/organizations/users/seats'),
    ]);
    setUsers(u);
    setInvites(inv);
    setSeats(s);
  }, []);

  useEffect(() => {
    void load().catch(() => {});
  }, [load]);

  const isAdmin = me?.role === 'ADMIN';
  const canManage = isAdmin && !readOnly && seats?.canAdd !== false;

  async function onCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await apiFetch('/organizations/users', {
        method: 'POST',
        body: JSON.stringify(createForm),
      });
      toast.push(t('userCreated') + ' ✓');
      setCreateForm({ name: '', email: '', password: '', role: 'USER' });
      setMode('list');
      await load();
    } catch (er: unknown) {
      toast.push(er instanceof Error ? er.message : tc('error'), 'error');
    } finally {
      setPending(false);
    }
  }

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await apiFetch<{ emailSent: boolean; inviteUrl?: string }>(
        '/organizations/users/invite',
        {
          method: 'POST',
          body: JSON.stringify(inviteForm),
        }
      );
      if (res.emailSent) {
        toast.push(t('inviteSent') + ' ✓');
      } else if (res.inviteUrl) {
        toast.push(t('inviteNoEmail') + ' ' + res.inviteUrl, 'error');
      } else {
        toast.push(t('inviteSent') + ' ✓');
      }
      setInviteForm({ name: '', email: '', role: 'USER' });
      setMode('list');
      await load();
    } catch (er: unknown) {
      toast.push(er instanceof Error ? er.message : tc('error'), 'error');
    } finally {
      setPending(false);
    }
  }

  async function onToggleActive(u: OrgUser) {
    if (u.id === me?.id) {
      toast.push(t('cannotDeactivateSelf'), 'error');
      return;
    }
    try {
      await apiFetch(`/organizations/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      await load();
    } catch (er: unknown) {
      toast.push(er instanceof Error ? er.message : tc('error'), 'error');
    }
  }

  async function onCancelInvite(id: string) {
    try {
      await apiFetch(`/organizations/users/invitations/${id}`, { method: 'DELETE' });
      await load();
    } catch (er: unknown) {
      toast.push(er instanceof Error ? er.message : tc('error'), 'error');
    }
  }

  return (
    <div className="space-y-6">
      {seats ? (
        <div className="rounded-lg border border-s-border bg-slate-50 px-4 py-3 text-sm">
          <p className="font-medium text-s-navy">{t('usersSeatsTitle')}</p>
          <p className="mt-1 text-s-muted">
            {t('usersSeatsUsage', { used: seats.used, max: seats.max })}
            {seats.pendingInvites > 0
              ? ` · ${t('usersPendingInvites', { count: seats.pendingInvites })}`
              : ''}
          </p>
          {!seats.canAdd ? (
            <p className="mt-2 text-xs text-amber-800">
              {t('usersSeatsFull')}{' '}
              <Link href="/subscription" className="underline">
                {t('usersUpgrade')}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {!readOnly && isAdmin ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === 'create' ? 'primary' : 'secondary'}
            size="sm"
            disabled={!canManage && mode !== 'list'}
            onClick={() => setMode(mode === 'create' ? 'list' : 'create')}
          >
            <UserPlus className="mr-1 h-4 w-4" />
            {t('createUser')}
          </Button>
          <Button
            type="button"
            variant={mode === 'invite' ? 'primary' : 'secondary'}
            size="sm"
            disabled={!canManage && mode !== 'list'}
            onClick={() => setMode(mode === 'invite' ? 'list' : 'invite')}
          >
            <Mail className="mr-1 h-4 w-4" />
            {t('inviteUser')}
          </Button>
        </div>
      ) : null}

      {mode === 'create' && canManage ? (
        <form
          onSubmit={onCreateUser}
          className="space-y-4 rounded-xl border border-s-border bg-white p-4"
        >
          <h3 className="text-sm font-semibold text-s-navy">{t('createUserTitle')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-s-muted">{t('userName')}</label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-s-muted">{t('userEmail')}</label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-s-muted">{t('userPassword')}</label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-s-muted">{t('userRole')}</label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, role: e.target.value as 'ADMIN' | 'USER' }))
                }
                className="w-full rounded-xl border border-s-border px-4 py-2.5 text-sm"
              >
                <option value="USER">{t('roleUser')}</option>
                <option value="ADMIN">{t('roleAdmin')}</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? '…' : t('createUserSubmit')}
          </Button>
        </form>
      ) : null}

      {mode === 'invite' && canManage ? (
        <form
          onSubmit={onInvite}
          className="space-y-4 rounded-xl border border-s-border bg-white p-4"
        >
          <h3 className="text-sm font-semibold text-s-navy">{t('inviteUserTitle')}</h3>
          <p className="text-xs text-s-muted">{t('inviteUserHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-s-muted">{t('userName')}</label>
              <Input
                value={inviteForm.name}
                onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-s-muted">{t('userEmail')}</label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-s-muted">{t('userRole')}</label>
              <select
                value={inviteForm.role}
                onChange={(e) =>
                  setInviteForm((f) => ({ ...f, role: e.target.value as 'ADMIN' | 'USER' }))
                }
                className="w-full rounded-xl border border-s-border px-4 py-2.5 text-sm"
              >
                <option value="USER">{t('roleUser')}</option>
                <option value="ADMIN">{t('roleAdmin')}</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? '…' : t('inviteUserSubmit')}
          </Button>
        </form>
      ) : null}

      {invites.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-medium text-s-navy">{t('pendingInvitesTitle')}</h3>
          <ul className="space-y-2">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-s-border bg-amber-50/50 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{inv.email}</span>
                  <span className="ml-2 text-xs text-s-muted">
                    {inv.role === 'ADMIN' ? t('roleAdmin') : t('roleUser')} · {t('expires')}{' '}
                    {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {isAdmin && !readOnly ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => void onCancelInvite(inv.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.length === 0 ? (
          <div className="col-span-full rounded-lg border border-s-border bg-slate-50 p-6 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-s-muted" />
            <p className="text-sm text-s-muted">{t('noUsersFound')}</p>
          </div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl border border-s-border bg-s-surface p-4 transition hover:border-brand hover:shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
                <span className="text-sm font-semibold">
                  {u.name?.charAt(0).toUpperCase() || u.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="mb-1 font-medium text-s-navy">{u.name || '—'}</h3>
              <p className="mb-3 text-xs text-s-muted">{u.email}</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    u.role === 'ADMIN'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {u.role === 'ADMIN' ? t('roleAdmin') : t('roleUser')}
                </span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                  )}
                >
                  {u.isActive ? t('active') : t('inactive')}
                </span>
              </div>
              {isAdmin && !readOnly && u.id !== me?.id ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void onToggleActive(u)}
                >
                  {u.isActive ? t('deactivateUser') : t('activateUser')}
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {!isAdmin ? <p className="text-xs text-s-muted">{t('usersAdminOnly')}</p> : null}
    </div>
  );
}
