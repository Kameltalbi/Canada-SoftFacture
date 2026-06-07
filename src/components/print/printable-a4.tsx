'use client';

import { type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type PrintFooterData = {
  companyName?: string;
  rc?: string;
  taxMatricule?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankInfo?: string;
};

interface PrintableA4Props {
  children: ReactNode;
  footer?: PrintFooterData;
  className?: string;
  style?: CSSProperties;
}

/**
 * A4 printable page container.
 * - 210mm × 297mm strict layout
 * - 15mm padding for content
 * - Fixed footer at the bottom (max 15mm)
 * - Content area reserves 20mm at bottom to never overlap footer
 * - Compatible with browser print and PDF export
 */
export function PrintableA4({ children, footer, className, style }: PrintableA4Props) {
  return (
    <div className={cn('a4-page print-area', className)} style={style}>
      {/* Content zone: 15mm padding, 20mm bottom reserved for footer */}
      <div
        className="print-no-break"
        style={{
          padding: '15mm',
          paddingBottom: '20mm',
          minHeight: 'calc(297mm - 20mm)',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>

      {/* Fixed footer */}
      {footer && <PrintFooter data={footer} />}
    </div>
  );
}

function PrintFooter({ data }: { data: PrintFooterData }) {
  const parts: string[] = [];
  if (data.rc) parts.push(`RC: ${data.rc}`);
  if (data.taxMatricule) parts.push(`MF: ${data.taxMatricule}`);
  if (data.phone) parts.push(`Tél: ${data.phone}`);
  if (data.email) parts.push(data.email);
  if (data.website) parts.push(data.website);
  if (data.bankInfo) parts.push(data.bankInfo);

  if (parts.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '15mm',
        boxSizing: 'border-box',
        padding: '0 15mm',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid #e2e8f0',
      }}
    >
      <p
        style={{
          fontSize: '7pt',
          color: '#64748b',
          textAlign: 'center',
          lineHeight: 1.5,
          margin: 0,
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        {data.companyName && (
          <span style={{ fontWeight: 600, color: '#475569' }}>
            {data.companyName}
            {parts.length > 0 ? ' — ' : ''}
          </span>
        )}
        {parts.join(' · ')}
      </p>
    </div>
  );
}

/**
 * Button to trigger browser print.
 * Wraps window.print() with proper focus handling.
 */
export function PrintButton({
  label = 'Imprimer',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        'no-print inline-flex items-center gap-2 rounded-lg border border-s-border bg-white px-4 py-2 text-sm font-medium text-s-navy hover:bg-slate-50',
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      {label}
    </button>
  );
}
