'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'invoices', label: 'Factures' },
  { id: 'quotes', label: 'Devis' },
  { id: 'clients', label: 'Clients' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function LandingProductPreview() {
  const [tab, setTab] = useState<TabId>('dashboard');

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl ring-1 ring-slate-200/80">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-red-400/80" />
          <span className="h-3 w-3 rounded-full bg-amber-400/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="ms-2 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-gradient-to-br from-slate-50 to-white p-4 md:p-6">
        {tab === 'dashboard' && <DashboardMock />}
        {tab === 'invoices' && <TableMock type="invoices" />}
        {tab === 'quotes' && <TableMock type="quotes" />}
        {tab === 'clients' && <TableMock type="clients" />}
      </div>
      <p className="border-t border-slate-200 bg-white px-4 py-2 text-center text-[10px] text-slate-400">
        Aperçu illustratif — interface réelle après inscription
      </p>
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-800">Mon activité</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'CA HT', value: '—', color: 'bg-blue-50 text-blue-800' },
          { label: 'Encaissé', value: '—', color: 'bg-emerald-50 text-emerald-800' },
          { label: 'TVA', value: '—', color: 'bg-violet-50 text-violet-800' },
          { label: 'Croissance', value: '—', color: 'bg-slate-100 text-slate-700' },
        ].map((k) => (
          <div key={k.label} className={cn('rounded-xl p-3', k.color)}>
            <p className="text-[10px] font-medium opacity-80">{k.label}</p>
            <p className="text-lg font-bold">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-medium text-slate-500">CA par mois (exemple)</p>
        <div className="flex h-24 items-end gap-1">
          {[30, 45, 25, 60, 40, 70, 55, 80, 50, 65, 75, 90].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-blue-500/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TableMock({ type }: { type: 'invoices' | 'quotes' | 'clients' }) {
  const headers =
    type === 'clients' ? ['Client', 'Email', 'Pays'] : ['N°', 'Client', 'Montant', 'Statut'];
  const rows =
    type === 'clients'
      ? [
          ['Client exemple', 'contact@exemple.fr', 'FR'],
          ['—', '—', '—'],
        ]
      : [
          [
            `${type === 'quotes' ? 'DEV' : 'FAC'}-2026-0001`,
            'Client exemple',
            '1 200,00 €',
            'Envoyé',
          ],
          ['—', '—', '—', '—'],
        ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-slate-700">
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
