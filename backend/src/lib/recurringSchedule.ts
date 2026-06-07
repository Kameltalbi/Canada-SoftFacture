import type { RecurringFrequency } from '../generated/prisma/index.js';

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, month));
}

/** Prochaine date d’exécution après `from` (strictement après si same day). */
export function computeNextRunDate(
  from: Date,
  frequency: RecurringFrequency,
  dayOfMonth?: number | null
): Date {
  const base = startOfDay(from);
  const dom = dayOfMonth ?? base.getDate();

  switch (frequency) {
    case 'WEEKLY': {
      const next = new Date(base);
      next.setDate(next.getDate() + 7);
      return next;
    }
    case 'MONTHLY': {
      const next = new Date(base);
      next.setMonth(next.getMonth() + 1);
      const day = clampDay(next.getFullYear(), next.getMonth(), dom);
      next.setDate(day);
      return next;
    }
    case 'QUARTERLY': {
      const next = new Date(base);
      next.setMonth(next.getMonth() + 3);
      const day = clampDay(next.getFullYear(), next.getMonth(), dom);
      next.setDate(day);
      return next;
    }
    case 'YEARLY': {
      const next = new Date(base);
      next.setFullYear(next.getFullYear() + 1);
      const day = clampDay(next.getFullYear(), next.getMonth(), dom);
      next.setDate(day);
      return next;
    }
    default:
      return base;
  }
}

/** Première échéance à partir de la date de début du modèle. */
export function initialNextRunDate(
  startDate: Date,
  frequency: RecurringFrequency,
  dayOfMonth?: number | null
): Date {
  const today = startOfDay(new Date());
  const start = startOfDay(startDate);

  if (start > today) {
    if (frequency === 'WEEKLY') return start;
    const dom = dayOfMonth ?? start.getDate();
    const d = new Date(start);
    d.setDate(clampDay(d.getFullYear(), d.getMonth(), dom));
    return d;
  }

  let candidate = start;
  let guard = 0;
  while (candidate <= today && guard < 120) {
    candidate = computeNextRunDate(candidate, frequency, dayOfMonth ?? start.getDate());
    guard += 1;
  }
  return candidate;
}

export function isDue(nextRunDate: Date, asOf = new Date()): boolean {
  return startOfDay(nextRunDate).getTime() <= startOfDay(asOf).getTime();
}
