'use client';

import { formatEuro, formatEuroShort } from '@/lib/format-money';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#64748b',
  '#ef4444',
];

type DonutSlice = { label: string; value: number; color?: string };

export function DonutChart({
  slices,
  size = 160,
  centerLabel,
}: {
  slices: DonutSlice[];
  size?: number;
  centerLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xs text-s-muted">—</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={size * 0.14} />
        {slices.map((slice, i) => {
          const pct = slice.value / total;
          const dash = pct * C;
          const el = (
            <circle
              key={slice.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={slice.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={size * 0.14}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      {centerLabel ? (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <span className="text-xs font-medium text-s-navy">{centerLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

export function GroupedBarChart({
  labels,
  series,
  height = 200,
}: {
  labels: string[];
  series: { name: string; values: number[]; color: string }[];
  height?: number;
}) {
  const all = series.flatMap((s) => s.values);
  const max = Math.max(...all, 1);

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-s-muted">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-1" style={{ height }}>
        {labels.map((label, i) => (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-full w-full items-end justify-center gap-0.5">
              {series.map((s) => (
                <div
                  key={s.name}
                  className="w-[42%] max-w-[14px] rounded-t-sm transition-all"
                  style={{
                    height: `${(s.values[i] / max) * 100}%`,
                    minHeight: s.values[i] > 0 ? 4 : 0,
                    background: s.color,
                  }}
                  title={`${s.name}: ${formatEuro(s.values[i])}`}
                />
              ))}
            </div>
            <span className="truncate text-[9px] text-s-muted">{label.slice(0, 3)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineTrendChart({
  labels,
  series,
  height = 200,
}: {
  labels: string[];
  series: { name: string; values: number[]; color: string }[];
  height?: number;
}) {
  const w = 600;
  const h = height;
  const pad = { t: 12, r: 12, b: 24, l: 8 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const n = labels.length;

  const points = (values: number[]) =>
    values.map((v, i) => {
      const x = pad.l + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
      const y = pad.t + innerH - (v / max) * innerH;
      return `${x},${y}`;
    });

  return (
    <div className="w-full overflow-x-auto">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-s-muted">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points(s.values).join(' ')}
          />
        ))}
        {labels.map((label, i) => {
          const x = pad.l + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
          return (
            <text
              key={label}
              x={x}
              y={h - 4}
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {label.slice(0, 3)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function SimpleBarChart({
  labels,
  values,
  color = '#3b82f6',
  height = 160,
}: {
  labels: string[];
  values: number[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {labels.map((label, i) => (
        <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="w-full max-w-[20px] rounded-t-md"
            style={{
              height: `${(values[i] / max) * 100}%`,
              minHeight: values[i] > 0 ? 6 : 0,
              background: color,
            }}
            title={`${values[i]} facture(s)`}
          />
          <span className="text-[9px] text-s-muted">{label.slice(0, 3)}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-s-border/60 bg-white p-5 shadow-sm', className)}>
      <h3 className="mb-4 text-sm font-semibold text-s-navy">{title}</h3>
      {children}
    </div>
  );
}

export function LegendAmounts({
  items,
}: {
  items: { label: string; value: number; color: string; pct?: number }[];
}) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            <span className="truncate text-s-muted">{item.label}</span>
          </span>
          <span className="shrink-0 font-medium text-s-navy">
            {formatEuroShort(item.value)}
            {item.pct != null ? (
              <span className="ms-1 text-xs text-s-muted">({item.pct.toFixed(1)} %)</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: 'blue' | 'green' | 'violet' | 'emerald';
}) {
  const accents = {
    blue: 'from-blue-50 to-white border-blue-100',
    green: 'from-emerald-50 to-white border-emerald-100',
    violet: 'from-violet-50 to-white border-violet-100',
    emerald: 'from-teal-50 to-white border-teal-100',
  };
  return (
    <div
      className={cn(
        'rounded-xl border bg-gradient-to-br p-5 shadow-sm',
        accent ? accents[accent] : 'border-s-border/60 from-white to-s-bg/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-s-muted">{label}</p>
        <span className="text-s-muted opacity-80">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-s-navy">{value}</p>
      {sub ? <p className="mt-1 text-xs text-s-muted">{sub}</p> : null}
    </div>
  );
}
