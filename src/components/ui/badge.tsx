import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  VALIDATED: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  SIGNED: 'bg-sky-50 text-sky-800 border-sky-200',
  SENT: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-900 border-amber-200',
  PAID: 'bg-brand-soft text-brand border-emerald-200/80',
  CANCELLED: 'bg-slate-50 text-slate-600 border-slate-200',
  REJECTED: 'bg-red-50 text-red-800 border-red-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  EXPIRED: 'bg-amber-50 text-amber-900 border-amber-200',
  CONVERTED: 'bg-violet-50 text-violet-900 border-violet-200',
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles[status] ?? styles.DRAFT
      )}
    >
      {label}
    </span>
  );
}
