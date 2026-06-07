'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatEuro } from '@/lib/format-money';

export function FilterDropdown({
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
        <div className="absolute start-0 top-full z-40 mt-1 max-h-64 min-w-[180px] overflow-y-auto rounded-xl border border-s-border bg-white py-1 shadow-lg">
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function FilterOption({
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

export function StatTabButton({
  active,
  label,
  count,
  amount,
  showAmount = true,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  amount?: number;
  showAmount?: boolean;
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
        {showAmount && amount !== undefined ? (
          <>
            <span className="mx-1 opacity-50">·</span>
            <span>{formatEuro(amount)}</span>
          </>
        ) : null}
      </span>
    </button>
  );
}

export const LIST_PAGE_SIZES = [10, 25, 50, 100] as const;

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  rowsText,
  prevLabel,
  nextLabel,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  rowsText: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-s-border px-5 py-3 text-sm text-s-muted">
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="rounded-lg border border-s-border bg-white px-2 py-1.5 text-sm"
        >
          {LIST_PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <p>{rowsText}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="rounded-lg border border-s-border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          {prevLabel}
        </button>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="rounded-lg border border-s-border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

/** Hook-friendly pagination slice */
export function paginateRows<T>(
  rows: T[],
  page: number,
  pageSize: number
): { rows: T[]; safePage: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), safePage, totalPages };
}
