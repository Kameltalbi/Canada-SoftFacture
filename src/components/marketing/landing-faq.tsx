'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type FaqItem = { q: string; a: string };

export function LandingFaq({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50/80"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              {item.q}
              <ChevronDown
                className={cn('h-5 w-5 shrink-0 text-slate-400 transition', isOpen && 'rotate-180')}
              />
            </button>
            {isOpen ? (
              <p className="border-t border-slate-100 px-5 pb-4 pt-0 text-sm leading-relaxed text-slate-600">
                {item.a}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
