'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { apiFetch, downloadInvoicePdfFromApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { formatEuro } from '@/lib/format-money';
import {
  ChevronDown,
  Download,
  MoreHorizontal,
  Plus,
  Mail,
  Copy,
  Search,
  Upload,
  User,
  Coins,
  Archive,
  ArrowRight,
  PenLine,
  Trash2,
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type InvoiceRow = {
  id: string;
  number: string | null;
  kind?: 'STANDARD' | 'DEPOSIT' | 'CREDIT_NOTE';
  issueDate: string;
  dueDate: string | null;
  totalTtc: unknown;
  currency: string;
  status: 'DRAFT' | 'VALIDATED' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  client: { id: string; name: string; email: string | null };
};

type StatusTab = 'all' | 'draft' | 'pending' | 'overdue' | 'paid' | 'uncollectible' | 'cancelled';
type TypeFilter = 'all' | 'STANDARD' | 'DEPOSIT' | 'CREDIT_NOTE';
type StatusFilter = 'all' | InvoiceRow['status'];

const STATUS_TABS: StatusTab[] = [
  'all',
  'draft',
  'pending',
  'overdue',
  'paid',
  'uncollectible',
  'cancelled',
];

const PAGE_SIZES = [10, 25, 50, 100] as const;

function invoiceAmount(inv: InvoiceRow): number {
  return Number(inv.totalTtc) || 0;
}

function isOverdue(inv: InvoiceRow): boolean {
  if (!inv.dueDate) return false;
  if (inv.status === 'PAID' || inv.status === 'CANCELLED' || inv.status === 'DRAFT') return false;
  return startOfDay(new Date(inv.dueDate)) < startOfDay(new Date());
}

function isPending(inv: InvoiceRow): boolean {
  return (
    (inv.status === 'VALIDATED' || inv.status === 'SENT' || inv.status === 'PARTIALLY_PAID') &&
    !isOverdue(inv)
  );
}

function matchesTab(inv: InvoiceRow, tab: StatusTab): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'draft':
      return inv.status === 'DRAFT';
    case 'pending':
      return isPending(inv);
    case 'overdue':
      return isOverdue(inv);
    case 'paid':
      return inv.status === 'PAID';
    case 'uncollectible':
      return false;
    case 'cancelled':
      return inv.status === 'CANCELLED';
  }
}

function canRecordPayment(status: InvoiceRow['status']): boolean {
  return status === 'VALIDATED' || status === 'SENT' || status === 'PARTIALLY_PAID';
}

function InvoiceRowActions({
  inv,
  t,
  tc,
  onAction,
}: {
  inv: InvoiceRow;
  t: (key: string) => string;
  tc: (key: string) => string;
  onAction: (action: string, inv: InvoiceRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPos = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, left: rect.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPos();
    window.addEventListener('scroll', updateMenuPos, true);
    window.addEventListener('resize', updateMenuPos);
    return () => {
      window.removeEventListener('scroll', updateMenuPos, true);
      window.removeEventListener('resize', updateMenuPos);
    };
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const cancelled = inv.status === 'CANCELLED';
  const isDraft = inv.status === 'DRAFT';
  const canDuplicate = !cancelled;
  const canPay = !isDraft && canRecordPayment(inv.status);
  const canSend = !isDraft && !cancelled;

  const quickBtn =
    'flex h-6 w-6 shrink-0 items-center justify-center text-slate-500 transition hover:bg-slate-50 hover:text-s-navy disabled:cursor-not-allowed disabled:opacity-35';

  const moreBtn =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-s-navy';

  /** Brouillon : Supprimer, Dupliquer, Modifier, Télécharger, Archiver */
  const draftMenuItems = [
    { key: 'deleteDraft', icon: Trash2, label: tc('delete'), danger: true },
    { key: 'duplicate', icon: Copy, label: t('actionDuplicate') },
    { key: 'edit', icon: PenLine, label: t('actionEdit') },
    { key: 'downloadPdf', icon: Download, label: t('actionDownload') },
    { key: 'archive', icon: Archive, label: t('actionArchive') },
  ] as const;

  /** Facture finalisée (menu ⋯) : Voir, Télécharger, Archiver */
  const finalizedOverflowItems = [
    { key: 'view', icon: ArrowRight, label: t('actionView') },
    { key: 'downloadPdf', icon: Download, label: t('actionDownload') },
    { key: 'archive', icon: Archive, label: t('actionArchive') },
  ] as const;

  const menuItems = isDraft ? draftMenuItems : finalizedOverflowItems;

  const menuDropdown =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              transform: 'translateX(-100%)',
              zIndex: 9999,
            }}
            className="min-w-[13rem] rounded-xl border border-s-border bg-white py-1 shadow-lg"
          >
            {menuItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(item.key, inv);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium hover:bg-slate-50',
                  'danger' in item && item.danger ? 'text-red-600 hover:bg-red-50' : 'text-s-navy'
                )}
              >
                <item.icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    'danger' in item && item.danger ? 'text-red-600' : 'text-s-muted'
                  )}
                />
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={rootRef}
        className={cn(
          'group/more inline-flex items-center justify-end rounded-lg border border-transparent transition-colors',
          open && 'border-s-border bg-white shadow-sm',
          'hover:border-s-border hover:bg-white hover:shadow-sm'
        )}
      >
        <div
          className={cn(
            'flex items-center overflow-hidden transition-all duration-200 ease-out',
            open
              ? 'max-w-[9rem] opacity-100'
              : 'max-w-0 opacity-0 group-hover/more:max-w-[9rem] group-hover/more:opacity-100'
          )}
        >
          {isDraft ? (
            <>
              <button
                type="button"
                className={cn(
                  quickBtn,
                  'border-e border-s-border/60 text-slate-500 hover:bg-red-50 hover:text-red-600'
                )}
                title={tc('delete')}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('deleteDraft', inv);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                className={cn(quickBtn, 'border-e border-s-border/60')}
                title={t('actionDuplicate')}
                disabled={!canDuplicate}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('duplicate', inv);
                }}
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                className={cn(quickBtn, 'border-e border-s-border/60')}
                title={t('actionEdit')}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('edit', inv);
                }}
              >
                <PenLine className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={cn(quickBtn, 'border-e border-s-border/60')}
                title={t('actionDuplicate')}
                disabled={!canDuplicate}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('duplicate', inv);
                }}
              >
                <Copy className="h-3 w-3" />
              </button>
              <button
                type="button"
                className={cn(quickBtn, 'border-e border-s-border/60')}
                title={t('actionRecordPayment')}
                disabled={!canPay}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('recordPayment', inv);
                }}
              >
                <Coins className="h-3 w-3" />
              </button>
              <button
                type="button"
                className={cn(quickBtn, 'border-e border-s-border/60')}
                title={t('actionSend')}
                disabled={!canSend}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('sendEmail', inv);
                }}
              >
                <Mail className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
        <button
          type="button"
          className={moreBtn}
          aria-label={t('actions')}
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            if (!open) updateMenuPos();
            setOpen((v) => !v);
          }}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
      {menuDropdown}
    </>
  );
}

function FilterDropdown({
  label,
  valueLabel,
  children,
}: {
  label: string;
  valueLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
          valueLabel
            ? 'border-[#1e3a8a]/30 bg-[#1e3a8a]/5 text-[#1e3a8a]'
            : 'border-s-border bg-white text-s-navy hover:bg-slate-50'
        )}
      >
        {valueLabel ?? label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open ? (
        <div className="absolute start-0 top-full z-40 mt-1 min-w-[180px] rounded-xl border border-s-border bg-white py-1 shadow-lg">
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      ) : null}
    </div>
  );
}

function FilterOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full px-4 py-2 text-left text-sm transition-colors',
        active ? 'bg-[#1e3a8a]/10 font-semibold text-[#1e3a8a]' : 'text-s-navy hover:bg-slate-50'
      )}
    >
      {children}
    </button>
  );
}

function StatusTabButton({
  active,
  label,
  count,
  amount,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  amount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 flex-col items-start border-b-2 px-4 py-3 text-left transition-colors',
        active
          ? 'border-[#1e3a8a] text-[#1e3a8a]'
          : 'border-transparent text-s-muted hover:border-slate-200 hover:text-s-navy'
      )}
    >
      <span className="text-sm font-semibold">{label}</span>
      <span className="mt-0.5 text-xs">
        <span className="font-bold">{count}</span>
        <span className="mx-1 opacity-50">·</span>
        <span>{formatEuro(amount)}</span>
      </span>
    </button>
  );
}

export default function InvoicesPage() {
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const { token } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [data, setData] = useState<InvoiceRow[] | null>(null);
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [emissionFilter, setEmissionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const rows = await apiFetch<InvoiceRow[]>('/invoices');
    setData(rows);
  }, []);

  useEffect(() => {
    if (!token) return;
    void load().catch((e: unknown) =>
      toast.push(e instanceof Error ? e.message : tc('error'), 'error')
    );
  }, [token, load, toast, tc]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const clients = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, string>();
    for (const inv of data) map.set(inv.client.id, inv.client.name);
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [data]);

  const emissionOptions = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const inv of data) {
      const d = new Date(inv.issueDate);
      set.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    return Array.from(set)
      .map((key) => {
        const [y, m] = key.split('-').map(Number);
        return {
          key,
          label: format(new Date(y, m, 1), 'MMMM yyyy', { locale: frLocale }),
        };
      })
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [data]);

  const baseFiltered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((inv) => {
      if (typeFilter !== 'all' && inv.kind !== typeFilter) return false;
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (clientFilter !== 'all' && inv.client.id !== clientFilter) return false;
      if (emissionFilter !== 'all') {
        const d = new Date(inv.issueDate);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key !== emissionFilter) return false;
      }
      if (!q) return true;
      return (
        inv.number?.toLowerCase().includes(q) ||
        inv.client.name.toLowerCase().includes(q) ||
        inv.client.email?.toLowerCase().includes(q)
      );
    });
  }, [data, query, typeFilter, statusFilter, clientFilter, emissionFilter]);

  const tabStats = useMemo(() => {
    const stats: Record<StatusTab, { count: number; amount: number }> = {
      all: { count: 0, amount: 0 },
      draft: { count: 0, amount: 0 },
      pending: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      uncollectible: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    };
    for (const inv of baseFiltered) {
      const amount = invoiceAmount(inv);
      stats.all.count += 1;
      stats.all.amount += amount;
      for (const tab of STATUS_TABS) {
        if (tab !== 'all' && matchesTab(inv, tab)) {
          stats[tab].count += 1;
          stats[tab].amount += amount;
        }
      }
    }
    return stats;
  }, [baseFiltered]);

  const filtered = useMemo(
    () => baseFiltered.filter((inv) => matchesTab(inv, activeTab)),
    [baseFiltered, activeTab]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, statusFilter, clientFilter, emissionFilter, activeTab, pageSize]);

  function tabLabel(tab: StatusTab): string {
    const keys: Record<StatusTab, string> = {
      all: 'tabAll',
      draft: 'tabDrafts',
      pending: 'tabPending',
      overdue: 'tabOverdue',
      paid: 'tabPaid',
      uncollectible: 'tabUncollectible',
      cancelled: 'tabCancelled',
    };
    return t(keys[tab]);
  }

  function typeLabel(kind: InvoiceRow['kind']): string {
    if (kind === 'DEPOSIT') return t('typeDeposit');
    if (kind === 'CREDIT_NOTE') return t('typeCreditNote');
    return t('typeFinal');
  }

  function statusLabel(status: InvoiceRow['status']): string {
    const map: Record<InvoiceRow['status'], string> = {
      DRAFT: 'statusDraft',
      VALIDATED: 'statusValidated',
      SENT: 'statusSent',
      PARTIALLY_PAID: 'statusPartiallyPaid',
      PAID: 'statusPaid',
      CANCELLED: 'statusCancelled',
    };
    return t(map[status]);
  }

  function exportCsv() {
    if (!filtered.length) {
      toast.push(tc('empty'), 'error');
      return;
    }
    const header = [
      t('columnNumber'),
      t('columnType'),
      t('columnAmountTtc'),
      t('client'),
      t('columnIssueDate'),
      t('columnDueDate'),
      t('status'),
    ];
    const rows = filtered.map((inv) => [
      inv.number ?? t('statusDraft'),
      typeLabel(inv.kind),
      invoiceAmount(inv).toFixed(2),
      inv.client.name,
      format(new Date(inv.issueDate), 'dd/MM/yyyy'),
      inv.dueDate ? format(new Date(inv.dueDate), 'dd/MM/yyyy') : '',
      statusLabel(inv.status),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleAction(action: string, inv: InvoiceRow) {
    const numLabel = inv.number ?? `brouillon-${inv.id.slice(0, 8)}`;
    switch (action) {
      case 'view':
      case 'edit':
        router.push(`/invoices/${inv.id}`);
        break;
      case 'recordPayment':
        router.push(`/invoices/${inv.id}`);
        break;
      case 'downloadPdf':
        void downloadInvoicePdfFromApi(inv.id, inv.number ?? `facture-${inv.id}`).catch(
          (e: unknown) => toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
        );
        break;
      case 'downloadPdfUnsigned': {
        const base = (inv.number ?? `facture-${inv.id}`).replace(/\.pdf$/i, '');
        void downloadInvoicePdfFromApi(inv.id, `${base}-sans-signature`, { unsigned: true }).catch(
          (e: unknown) => toast.push(e instanceof Error ? e.message : 'Erreur', 'error')
        );
        break;
      }
      case 'sendEmail': {
        const email = inv.client.email?.trim();
        if (!email) {
          toast.push(t('toastNoClientEmail'), 'error');
          return;
        }
        const subject = encodeURIComponent(`Facture ${numLabel}`);
        const body = encodeURIComponent(
          `Bonjour,\n\nVous trouverez votre facture ${numLabel}.\n(${t('shareAttachPdfHint')})\n\nCordialement`
        );
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        break;
      }
      case 'sendWhatsapp': {
        const text = encodeURIComponent(`${t('shareAttachPdfHint')} — ${numLabel}`);
        window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
        break;
      }
      case 'duplicate':
        void apiFetch<{ id: string }>(`/invoices/${inv.id}/duplicate`, { method: 'POST' })
          .then((created) => {
            toast.push(t('toastInvoiceDuplicated') + ' ✓');
            void load();
            router.push(`/invoices/${created.id}`);
          })
          .catch((e: unknown) => toast.push(e instanceof Error ? e.message : 'Erreur', 'error'));
        break;
      case 'deliveryNote':
        toast.push(t('toastDeliveryNoteSoon'));
        break;
      case 'archive':
        toast.push(t('toastArchiveSoon'));
        break;
      case 'deleteDraft':
        setDeleteTarget(inv);
        break;
      case 'cancelInvoice': {
        if (!window.confirm(t('cancelInvoiceListConfirm'))) return;
        void apiFetch(`/invoices/${inv.id}/cancel`, { method: 'POST' })
          .then(() => {
            toast.push(t('toastInvoiceCancelled') + ' ✓');
            void load();
          })
          .catch((e: unknown) => toast.push(e instanceof Error ? e.message : 'Erreur', 'error'));
        break;
      }
    }
  }

  async function confirmDeleteInvoice() {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await apiFetch(`/invoices/${deleteTarget.id}`, { method: 'DELETE' });
      toast.push(t('toastInvoiceDeleted') + ' ✓');
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      toast.push(e instanceof Error ? e.message : tc('error'), 'error');
    } finally {
      setDeletePending(false);
    }
  }

  if (!data) {
    return <p className="text-sm text-s-muted">{tc('loading')}</p>;
  }

  const rowStart = filtered.length ? (safePage - 1) * pageSize + 1 : 0;
  const rowEnd = Math.min(safePage * pageSize, filtered.length);

  return (
    <div className="space-y-0">
      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-s-navy">{t('listTitle')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/invoices/new">
            <Button type="button" className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white">
              <Plus className="h-4 w-4" />
              {t('new')}
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            className="border border-s-border bg-white"
            onClick={exportCsv}
          >
            <Download className="h-4 w-4" />
            {t('export')}
          </Button>
          <button
            type="button"
            className="rounded-lg border border-s-border bg-white p-2.5 text-s-muted hover:bg-slate-50 hover:text-s-navy"
            title={t('importSoon')}
            onClick={() => toast.push(t('importSoon'))}
          >
            <Upload className="h-4 w-4" />
          </button>
          <div ref={headerMenuRef} className="relative">
            <button
              type="button"
              className="rounded-lg border border-s-border bg-white p-2.5 text-s-muted hover:bg-slate-50 hover:text-s-navy"
              onClick={() => setHeaderMenuOpen((v) => !v)}
              aria-label={t('actions')}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {headerMenuOpen ? (
              <div className="absolute end-0 top-full z-40 mt-1 min-w-[200px] rounded-xl border border-s-border bg-white py-1 shadow-lg">
                <Link
                  href="/invoices/deposit/new"
                  className="block px-4 py-2.5 text-sm font-medium text-s-navy hover:bg-slate-50"
                  onClick={() => setHeaderMenuOpen(false)}
                >
                  {t('newDeposit')}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Onglets statut */}
      <div className="mb-4 overflow-x-auto border-b border-s-border">
        <div className="flex min-w-max">
          {STATUS_TABS.map((tab) => (
            <StatusTabButton
              key={tab}
              active={activeTab === tab}
              label={tabLabel(tab)}
              count={tabStats[tab].count}
              amount={tabStats[tab].amount}
              onClick={() => setActiveTab(tab)}
            />
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-s-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchInvoicePlaceholder')}
            className="w-full rounded-lg border border-s-border bg-white py-2 pe-3 ps-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20"
          />
        </div>
        <FilterDropdown
          label={t('filterType')}
          valueLabel={typeFilter !== 'all' ? typeLabel(typeFilter) : undefined}
        >
          <FilterOption active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>
            {t('filterAll')}
          </FilterOption>
          <FilterOption
            active={typeFilter === 'STANDARD'}
            onClick={() => setTypeFilter('STANDARD')}
          >
            {t('typeFinal')}
          </FilterOption>
          <FilterOption active={typeFilter === 'DEPOSIT'} onClick={() => setTypeFilter('DEPOSIT')}>
            {t('typeDeposit')}
          </FilterOption>
          <FilterOption
            active={typeFilter === 'CREDIT_NOTE'}
            onClick={() => setTypeFilter('CREDIT_NOTE')}
          >
            {t('typeCreditNote')}
          </FilterOption>
        </FilterDropdown>
        <FilterDropdown
          label={t('filterStatus')}
          valueLabel={statusFilter !== 'all' ? statusLabel(statusFilter) : undefined}
        >
          <FilterOption active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
            {t('filterAll')}
          </FilterOption>
          {(
            [
              'DRAFT',
              'VALIDATED',
              'SENT',
              'PARTIALLY_PAID',
              'PAID',
              'CANCELLED',
            ] as InvoiceRow['status'][]
          ).map((s) => (
            <FilterOption key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {statusLabel(s)}
            </FilterOption>
          ))}
        </FilterDropdown>
        <FilterDropdown
          label={t('filterClient')}
          valueLabel={
            clientFilter !== 'all' ? clients.find((c) => c.id === clientFilter)?.name : undefined
          }
        >
          <FilterOption active={clientFilter === 'all'} onClick={() => setClientFilter('all')}>
            {t('filterAll')}
          </FilterOption>
          {clients.map((c) => (
            <FilterOption
              key={c.id}
              active={clientFilter === c.id}
              onClick={() => setClientFilter(c.id)}
            >
              {c.name}
            </FilterOption>
          ))}
        </FilterDropdown>
        <FilterDropdown
          label={t('filterIssueDate')}
          valueLabel={
            emissionFilter !== 'all'
              ? emissionOptions.find((o) => o.key === emissionFilter)?.label
              : undefined
          }
        >
          <FilterOption active={emissionFilter === 'all'} onClick={() => setEmissionFilter('all')}>
            {t('filterAllDates')}
          </FilterOption>
          {emissionOptions.map((o) => (
            <FilterOption
              key={o.key}
              active={emissionFilter === o.key}
              onClick={() => setEmissionFilter(o.key)}
            >
              <span className="capitalize">{o.label}</span>
            </FilterOption>
          ))}
        </FilterDropdown>
      </div>

      {/* Tableau */}
      <section className="rounded-xl border border-s-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-s-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-s-muted">
                <th className="px-5 py-3">{t('columnNumber')}</th>
                <th className="px-5 py-3">{t('columnType')}</th>
                <th className="px-5 py-3">{t('columnAmountTtc')}</th>
                <th className="px-5 py-3">{t('client')}</th>
                <th className="px-5 py-3">{t('columnIssueDate')}</th>
                <th className="px-5 py-3">{t('columnDueDate')}</th>
                <th className="px-5 py-3 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((inv) => {
                const isDraft = inv.status === 'DRAFT';
                const kind = inv.kind ?? 'STANDARD';
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-s-border/50 transition hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-4">
                      {isDraft ? (
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="italic text-s-muted hover:text-[#1e3a8a]"
                        >
                          {t('statusDraft')}
                        </Link>
                      ) : (
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-semibold text-[#1e3a8a] hover:underline"
                        >
                          {inv.number}
                        </Link>
                      )}
                      {!isDraft && inv.number ? (
                        <p className="mt-1">
                          <span className="inline-flex rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                            {t('badgeFinalized')}
                          </span>
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          kind === 'STANDARD' && 'bg-emerald-50 text-emerald-700',
                          kind === 'DEPOSIT' && 'bg-violet-50 text-violet-700',
                          kind === 'CREDIT_NOTE' && 'bg-rose-50 text-rose-700'
                        )}
                      >
                        {typeLabel(kind)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-s-navy">
                      {formatEuro(invoiceAmount(inv))}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-s-muted">
                          <User className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-medium text-[#1e3a8a]">{inv.client.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-s-navy">
                      {format(new Date(inv.issueDate), 'd MMM', { locale: frLocale })}
                    </td>
                    <td className="px-5 py-4 text-s-navy">
                      {inv.dueDate
                        ? format(new Date(inv.dueDate), 'd MMM', { locale: frLocale })
                        : '—'}
                    </td>
                    <td className="relative px-5 py-4">
                      <div
                        className="flex items-center justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InvoiceRowActions inv={inv} t={t} tc={tc} onAction={handleAction} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length ? (
            <p className="py-16 text-center text-sm text-s-muted">{tc('empty')}</p>
          ) : null}
        </div>

        {/* Pagination */}
        {filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-s-border px-5 py-3 text-sm text-s-muted">
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-s-border bg-white px-2 py-1.5 text-sm"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <p>{t('paginationRows', { start: rowStart, end: rowEnd, total: filtered.length })}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-s-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {t('paginationPrev')}
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-s-border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                {t('paginationNext')}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        open={deleteTarget !== null}
        title={t('deleteInvoiceTitle')}
        onClose={() => !deletePending && setDeleteTarget(null)}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={deletePending}
              onClick={() => setDeleteTarget(null)}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={deletePending}
              onClick={() => void confirmDeleteInvoice()}
            >
              {deletePending ? tc('loading') : t('deleteInvoiceAction')}
            </Button>
          </>
        }
      >
        <p className="text-s-navy">{t('deleteInvoiceConfirm')}</p>
      </Modal>
    </div>
  );
}
