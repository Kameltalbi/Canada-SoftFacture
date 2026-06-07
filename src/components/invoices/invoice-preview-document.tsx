'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PrintableA4 } from '@/components/print/printable-a4';
import {
  accentRgba,
  documentPreviewColors,
  previewNotesBoxStyle,
  previewRowBorderStyle,
  previewSectionLabelStyle,
  previewTableHeadProps,
  previewTotalsRowStyle,
  type DocumentPreviewStyleProps,
} from '@/lib/document-preview-style';
import { DEFAULT_DOCUMENT_APPEARANCE } from '@/lib/document-appearance';
import {
  DocumentPreviewHeader,
  DocumentPreviewParties,
} from '@/components/invoices/document-preview-header';
import { cn } from '@/lib/utils';

export type InvoicePreviewLine = {
  description: string;
  quantity: number;
  unitPriceHt: number;
  taxRate: number;
  lineTotalHt: number;
};

export type InvoicePreviewData = {
  documentTitle: string;
  number: string;
  issueDate: string;
  dueDate?: string | null;
  isDeposit?: boolean;
  companyName: string;
  companyTax?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companySlogan?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
  clientName: string;
  clientTax?: string | null;
  clientAddress?: string | null;
  clientCity?: string | null;
  subject?: string | null;
  notes?: string | null;
  currency: string;
  applyVat: boolean;
  lines: InvoicePreviewLine[];
  subtotalHt: number;
  vatTotal: number;
  tpsTotal: number;
  tvqTotal: number;
  totalTtc: number;
  advanceDeduction?: number;
  netToPay: number;
  labels: {
    client: string;
    designation: string;
    qty: string;
    unit: string;
    unitPrice: string;
    totalHt: string;
    subtotalHt: string;
    vat: string;
    totalTtc: string;
    advanceDeduction: string;
    netToPay: string;
    issueDate: string;
    dueDate: string;
    paymentMethods: string;
  };
};

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatDate(iso: string) {
  try {
    return format(new Date(iso), 'dd/MM/yyyy', { locale: fr });
  } catch {
    return iso;
  }
}

/** Rendu HTML A4 de la facture pour l’aperçu écran / impression. */
export function InvoicePreviewDocument({
  data,
  className,
  accentColor,
  logoUrl,
  template = 'CLASSIC',
  fontFamily = 'Open Sans',
  appearance = DEFAULT_DOCUMENT_APPEARANCE,
}: {
  data: InvoicePreviewData;
  className?: string;
} & DocumentPreviewStyleProps) {
  const accent = accentColor ?? '#1e3a8a';
  const colors = documentPreviewColors(accent);
  const tableHead = previewTableHeadProps(template, accent);

  return (
    <PrintableA4
      className={cn('text-[10pt] text-slate-700', className)}
      style={{ fontFamily: `"${fontFamily}", sans-serif` }}
      footer={{
        companyName: data.companyName,
        taxMatricule: data.companyTax ?? undefined,
      }}
    >
      <DocumentPreviewHeader
        accent={accent}
        logoUrl={logoUrl}
        appearance={appearance}
        company={{
          companyName: data.companyName,
          companyTax: data.companyTax,
          companyAddress: data.companyAddress,
          companyCity: data.companyCity,
          companySlogan: data.companySlogan,
          companyPhone: data.companyPhone,
          companyEmail: data.companyEmail,
          companyWebsite: data.companyWebsite,
        }}
        meta={{
          docTitle: data.documentTitle,
          number: data.number,
          issueDateLabel: data.labels.issueDate,
          issueDateFormatted: formatDate(data.issueDate),
          secondaryDateLabel: data.dueDate ? data.labels.dueDate : undefined,
          secondaryDateFormatted: data.dueDate ? formatDate(data.dueDate) : undefined,
        }}
      />

      <DocumentPreviewParties
        accent={accent}
        appearance={appearance}
        company={{
          companyName: data.companyName,
          companyTax: data.companyTax,
          companyAddress: data.companyAddress,
          companyCity: data.companyCity,
          companySlogan: data.companySlogan,
          companyPhone: data.companyPhone,
          companyEmail: data.companyEmail,
          companyWebsite: data.companyWebsite,
        }}
        recipient={{
          name: data.clientName,
          taxId: data.clientTax,
          address: data.clientAddress,
          city: data.clientCity,
        }}
        recipientLabel={data.labels.client === 'Client' ? 'DESTINATAIRE' : data.labels.client}
      />

      {data.subject ? (
        <div className="mb-6">
          <p
            className="mb-2 text-[8pt] font-bold uppercase tracking-wide"
            style={previewSectionLabelStyle(colors)}
          >
            Objet
          </p>
          <p className="text-[9pt] text-slate-700">{data.subject}</p>
        </div>
      ) : null}

      <table className="w-full border-collapse text-[9pt]">
        <thead>
          <tr className={tableHead.className} style={tableHead.style}>
            <th className="px-2 py-2.5 text-start font-bold uppercase tracking-wide">
              {data.labels.designation}
            </th>
            <th className="w-14 px-2 py-2.5 text-end font-bold uppercase tracking-wide">
              {data.labels.qty}
            </th>
            <th className="w-12 px-2 py-2.5 text-center font-bold uppercase tracking-wide">
              {data.labels.unit}
            </th>
            <th className="w-24 px-2 py-2.5 text-end font-bold uppercase tracking-wide">
              {data.labels.unitPrice}
            </th>
            <th className="w-24 px-2 py-2.5 text-end font-bold uppercase tracking-wide">
              {data.labels.totalHt}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line, i) => (
            <tr key={i} style={previewRowBorderStyle(colors)}>
              <td className="px-2 py-3 text-slate-800">{line.description}</td>
              <td className="px-2 py-3 text-end text-slate-700">{line.quantity}</td>
              <td className="px-2 py-3 text-center text-slate-500">u</td>
              <td className="px-2 py-3 text-end text-slate-700">
                {formatMoney(line.unitPriceHt, data.currency)}
              </td>
              <td className="px-2 py-3 text-end font-medium text-slate-800">
                {formatMoney(line.lineTotalHt, data.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 flex justify-end">
        <div className="w-full max-w-xs text-[9pt]">
          <div className="flex justify-between py-2" style={previewTotalsRowStyle(colors)}>
            <span className="text-slate-500">{data.labels.subtotalHt}</span>
            <span className="font-medium text-slate-800">
              {formatMoney(data.subtotalHt, data.currency)}
            </span>
          </div>
          {data.applyVat ? (
            <>
              <div className="flex justify-between py-2" style={previewTotalsRowStyle(colors)}>
                <span className="text-slate-500">TPS (5%)</span>
                <span className="font-medium text-slate-800">
                  {formatMoney(data.tpsTotal, data.currency)}
                </span>
              </div>
              <div className="flex justify-between py-2" style={previewTotalsRowStyle(colors)}>
                <span className="text-slate-500">TVQ (9,975%)</span>
                <span className="font-medium text-slate-800">
                  {formatMoney(data.tvqTotal, data.currency)}
                </span>
              </div>
            </>
          ) : null}
          <div
            className="flex justify-between py-2.5 font-bold text-slate-900"
            style={previewTotalsRowStyle(colors, 'emphasis')}
          >
            <span>{data.labels.totalTtc}</span>
            <span>{formatMoney(data.totalTtc, data.currency)}</span>
          </div>
          {(data.advanceDeduction ?? 0) > 0 ? (
            <div className="flex justify-between py-2" style={previewTotalsRowStyle(colors)}>
              <span className="text-slate-500">{data.labels.advanceDeduction}</span>
              <span className="font-medium text-red-600">
                − {formatMoney(data.advanceDeduction!, data.currency)}
              </span>
            </div>
          ) : null}
          <div
            className="mt-3 flex items-center justify-between rounded-lg px-4 py-3 text-white"
            style={{ backgroundColor: accent }}
          >
            <span className="text-sm font-bold">{data.labels.netToPay}</span>
            <span className="text-lg font-bold">{formatMoney(data.netToPay, data.currency)}</span>
          </div>
        </div>
      </div>

      {data.notes ? (
        <div className="mt-8 rounded-lg p-4" style={previewNotesBoxStyle(colors)}>
          <p className="whitespace-pre-wrap text-[9pt] text-slate-600">{data.notes}</p>
        </div>
      ) : null}

      <div className="mt-8 text-[8pt]" style={{ color: accentRgba(accent, 0.85) }}>
        <p className="font-semibold" style={{ color: colors.accent }}>
          {data.labels.paymentMethods}
        </p>
        <p className="mt-1">Virement bancaire · Chèque · Interac</p>
      </div>
    </PrintableA4>
  );
}
