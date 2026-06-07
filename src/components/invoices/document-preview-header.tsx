'use client';

import { cn } from '@/lib/utils';
import { resolveLogoDisplayUrl } from '@/lib/org-logo';
import { logoDisplaySize, type DocumentAppearanceConfig } from '@/lib/document-appearance';

export type DocumentPreviewHeaderMeta = {
  docTitle: string;
  number: string;
  issueDateLabel: string;
  issueDateFormatted: string;
  secondaryDateLabel?: string;
  secondaryDateFormatted?: string;
};

export type DocumentPreviewHeaderCompany = {
  companyName: string;
  companyTax?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companySlogan?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyWebsite?: string | null;
};

export type DocumentPreviewRecipient = {
  name: string;
  taxId?: string | null;
  address?: string | null;
  city?: string | null;
  email?: string | null;
  phone?: string | null;
};

type CompanyAppearanceProps = {
  company: DocumentPreviewHeaderCompany;
  appearance: DocumentAppearanceConfig;
  className?: string;
};

type PartiesProps = {
  company: DocumentPreviewHeaderCompany;
  recipient: DocumentPreviewRecipient;
  accent: string;
  appearance: DocumentAppearanceConfig;
  issuerLabel?: string;
  recipientLabel?: string;
  className?: string;
};

type HeaderProps = {
  meta: DocumentPreviewHeaderMeta;
  company: DocumentPreviewHeaderCompany;
  accent: string;
  logoUrl?: string | null;
  appearance: DocumentAppearanceConfig;
};

function CompanyDetails({ company, appearance, className }: CompanyAppearanceProps) {
  const addressLine = [company.companyAddress, company.companyCity].filter(Boolean).join(', ');

  return (
    <div className={className}>
      {!appearance.hideCompanyName ? (
        <p className="text-[10pt] font-bold text-slate-900">{company.companyName}</p>
      ) : null}
      {!appearance.hideSlogan && company.companySlogan ? (
        <p className="mt-0.5 text-[9pt] italic text-slate-500">{company.companySlogan}</p>
      ) : null}
      {!appearance.hideAddress && addressLine ? (
        <p className="mt-1 text-[9pt] text-slate-600">{addressLine}</p>
      ) : null}
      {!appearance.hidePhone && company.companyPhone ? (
        <p className="text-[9pt] text-slate-600">{company.companyPhone}</p>
      ) : null}
      {!appearance.hideEmail && company.companyEmail ? (
        <p className="text-[9pt] text-slate-600">{company.companyEmail}</p>
      ) : null}
      {!appearance.hideWebsite && company.companyWebsite ? (
        <p className="text-[9pt] text-slate-600">{company.companyWebsite}</p>
      ) : null}
      {!appearance.hideSiret && company.companyTax ? (
        <p className="mt-1 text-[9pt] text-slate-600">SIRET : {company.companyTax}</p>
      ) : null}
      {!appearance.hideVat && company.companyTax ? (
        <p className="text-[9pt] text-slate-600">N° TVA : FR{company.companyTax.slice(0, 2)}…</p>
      ) : null}
    </div>
  );
}

function RecipientDetails({ recipient }: { recipient: DocumentPreviewRecipient }) {
  const addressLine = [recipient.address, recipient.city].filter(Boolean).join(', ');

  return (
    <div>
      <p className="text-[10pt] font-bold text-slate-900">{recipient.name}</p>
      {addressLine ? <p className="mt-1 text-[9pt] text-slate-600">{addressLine}</p> : null}
      {recipient.email ? <p className="text-[9pt] text-slate-600">{recipient.email}</p> : null}
      {recipient.phone ? <p className="text-[9pt] text-slate-600">{recipient.phone}</p> : null}
      {recipient.taxId ? (
        <p className="mt-1 text-[9pt] text-slate-600">SIRET : {recipient.taxId}</p>
      ) : null}
    </div>
  );
}

function DocMeta({ meta, accent }: { meta: DocumentPreviewHeaderMeta; accent: string }) {
  return (
    <div className="shrink-0 text-end">
      <p className="text-[22pt] font-bold leading-tight tracking-wide" style={{ color: accent }}>
        {meta.docTitle}
      </p>
      <p className="mt-1 text-[10pt] font-semibold text-slate-700">N° {meta.number}</p>
      <p className="mt-1 text-[9pt] text-slate-600">
        {meta.issueDateLabel} : {meta.issueDateFormatted}
      </p>
      {meta.secondaryDateLabel && meta.secondaryDateFormatted ? (
        <p className="text-[9pt] text-slate-600">
          {meta.secondaryDateLabel} : {meta.secondaryDateFormatted}
        </p>
      ) : null}
    </div>
  );
}

function LogoImg({
  logoUrl,
  scale,
  centered,
}: {
  logoUrl: string;
  scale: number;
  centered?: boolean;
}) {
  const { height, maxWidth } = logoDisplaySize(scale);
  const src = resolveLogoDisplayUrl(logoUrl) ?? logoUrl;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      style={{ height, maxWidth, width: 'auto' }}
      className={cn('object-contain', centered ? 'mx-auto object-center' : 'object-left')}
    />
  );
}

function LogoFallback({ company, appearance }: CompanyAppearanceProps) {
  if (appearance.hideCompanyName) return null;
  return <p className="text-lg font-bold text-slate-900">{company.companyName}</p>;
}

/** Ligne 1 : logo à gauche, type de document + numéro + date à droite. */
export function DocumentPreviewHeader({ meta, company, accent, logoUrl, appearance }: HeaderProps) {
  if (appearance.logoPosition === 'header') {
    const { height } = logoDisplaySize(appearance.logoScale);
    return (
      <div className="mb-5">
        <div
          className="-mx-[15mm] mb-4 flex min-h-[72px] items-center px-[15mm] py-4"
          style={{ backgroundColor: accent, minHeight: Math.max(72, height + 32) }}
        >
          {logoUrl ? (
            <LogoImg
              logoUrl={logoUrl}
              scale={appearance.logoScale}
              centered={appearance.logoCentered ?? true}
            />
          ) : (
            !appearance.hideCompanyName && (
              <p className="text-lg font-bold text-white">{company.companyName}</p>
            )
          )}
        </div>
        <div className="flex justify-end">
          <DocMeta meta={meta} accent={accent} />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 flex items-start justify-between gap-8">
      <div className={cn('min-w-0 max-w-[55%]', appearance.logoCentered && 'mx-auto text-center')}>
        {logoUrl ? (
          <LogoImg
            logoUrl={logoUrl}
            scale={appearance.logoScale}
            centered={appearance.logoCentered}
          />
        ) : (
          <LogoFallback company={company} appearance={appearance} />
        )}
      </div>
      <DocMeta meta={meta} accent={accent} />
    </div>
  );
}

/** Ligne 2 : blocs Émetteur et Destinataire côte à côte. */
export function DocumentPreviewParties({
  company,
  recipient,
  accent,
  appearance,
  issuerLabel = 'ÉMETTEUR',
  recipientLabel = 'DESTINATAIRE',
  className,
}: PartiesProps) {
  return (
    <div className={cn('mb-6 grid grid-cols-2 gap-4', className)}>
      <div className="overflow-hidden rounded-md border border-slate-200">
        <div
          className="px-3 py-1.5 text-[8pt] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: accent }}
        >
          {issuerLabel}
        </div>
        <div className="p-3">
          <CompanyDetails company={company} appearance={appearance} />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border border-slate-200">
        <div
          className="px-3 py-1.5 text-[8pt] font-bold uppercase tracking-wide text-white"
          style={{ backgroundColor: accent }}
        >
          {recipientLabel}
        </div>
        <div className="p-3">
          <RecipientDetails recipient={recipient} />
        </div>
      </div>
    </div>
  );
}
