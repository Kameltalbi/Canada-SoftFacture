import { cn } from '@/lib/utils';

export type PdfCatalogTemplateId =
  | 'CLASSIC'
  | 'MODERN'
  | 'MINIMAL'
  | 'MONO'
  | 'BLUE_PRO'
  | 'CORPORATE'
  | 'BUSINESS'
  | 'PROFESSIONAL';

export const PDF_CATALOG_TEMPLATES: PdfCatalogTemplateId[] = [
  'CLASSIC',
  'MODERN',
  'MONO',
  'BLUE_PRO',
  'MINIMAL',
  'CORPORATE',
  'BUSINESS',
  'PROFESSIONAL',
];

type PreviewProps = { className?: string };

export function ClassicTemplatePreview({ className }: PreviewProps) {
  return (
    <div
      className={cn(
        'aspect-[210/297] overflow-hidden rounded-lg border border-teal-100 bg-white p-3 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="h-2 w-16 rounded bg-teal-600" />
          <div className="h-1.5 w-12 rounded bg-slate-200" />
        </div>
        <div className="h-4 w-14 rounded bg-teal-600" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="h-10 rounded border border-slate-100 bg-slate-50" />
        <div className="h-10 rounded border border-slate-100 bg-slate-50" />
      </div>
      <div className="mt-2 h-3 rounded bg-teal-600" />
      <div className="mt-2 space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between border-b border-slate-100 pb-1">
            <div className="h-1.5 w-20 rounded bg-slate-200" />
            <div className="h-1.5 w-8 rounded bg-slate-300" />
          </div>
        ))}
      </div>
      <div className="ml-auto mt-3 h-6 w-16 rounded border border-teal-200 bg-teal-50" />
    </div>
  );
}

export function ModernTemplatePreview({ className }: PreviewProps) {
  return (
    <div
      className={cn(
        'aspect-[210/297] overflow-hidden rounded-lg border border-blue-100 bg-white p-3 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="h-2 w-16 rounded bg-blue-600" />
        <div className="text-right">
          <div className="ml-auto h-4 w-14 rounded bg-slate-900" />
          <div className="ml-auto mt-1 h-1.5 w-10 rounded bg-blue-500" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 border-t-2 border-blue-500 bg-blue-50 p-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-0.5">
            <div className="h-1 rounded bg-blue-500" />
            <div className="h-1.5 rounded bg-slate-400" />
          </div>
        ))}
      </div>
      <div className="mt-2 h-3 rounded bg-blue-600" />
      <div className="mt-2 space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between border-b border-slate-100 pb-1">
            <div className="h-1.5 w-20 rounded bg-slate-200" />
            <div className="h-1.5 w-8 rounded bg-slate-400" />
          </div>
        ))}
      </div>
      <div className="ml-auto mt-3 h-6 w-16 rounded bg-blue-100" />
    </div>
  );
}

export function BlueProTemplatePreview({ className }: PreviewProps) {
  return (
    <div
      className={cn(
        'aspect-[210/297] overflow-hidden rounded-lg border border-blue-100 bg-white p-3 shadow-sm',
        className
      )}
    >
      <div className="mb-3 flex items-start justify-between border-b-2 border-slate-900 pb-3">
        <div className="space-y-1">
          <div className="h-5 w-5 rounded-sm border border-slate-200 bg-slate-100" />
          <div className="h-2 w-18 rounded bg-slate-900" />
          <div className="h-1.5 w-14 rounded bg-slate-300" />
        </div>
        <div className="text-right">
          <div className="ml-auto h-1.5 w-12 rounded bg-slate-300" />
          <div className="ml-auto mt-1 h-5 w-20 rounded bg-slate-900" />
          <div className="ml-auto mt-2 h-3 w-16 rounded bg-blue-100" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-l border-slate-100 pl-2">
            <div className="h-1 rounded bg-slate-300" />
            <div className="mt-1 h-1.5 rounded bg-slate-600" />
            <div className="mt-1 h-1 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mt-4 h-4 rounded-sm bg-blue-50" />
      <div className="mt-2 space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between border-b border-slate-100 pb-1.5">
            <div>
              <div className="h-1 w-4 rounded bg-slate-300" />
              <div className="mt-1 h-1.5 w-20 rounded bg-slate-700" />
            </div>
            <div className="h-1.5 w-10 rounded bg-slate-500" />
          </div>
        ))}
      </div>
      <div className="ml-auto mt-3 w-20 border border-slate-900 bg-slate-50 p-2">
        <div className="h-1.5 rounded bg-slate-400" />
        <div className="mt-1 h-2 rounded bg-slate-900" />
      </div>
    </div>
  );
}

export function CorporateTemplatePreview({ className }: PreviewProps) {
  return (
    <div
      className={cn(
        'aspect-[210/297] overflow-hidden rounded-lg border border-amber-100 bg-white p-3 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between border-b-2 border-amber-500 pb-2">
        <div className="h-3 w-14 rounded bg-slate-800" />
        <div className="h-4 w-12 rounded bg-amber-500" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="h-8 rounded bg-slate-100" />
        <div className="h-8 rounded bg-slate-100" />
      </div>
      <div className="mt-2 h-3 rounded bg-slate-800" />
      <div className="mt-2 space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between border-b border-slate-100 pb-1">
            <div className="h-1.5 w-20 rounded bg-slate-200" />
            <div className="h-1.5 w-8 rounded bg-amber-400" />
          </div>
        ))}
      </div>
      <div className="ml-auto mt-3 h-6 w-16 rounded bg-slate-800" />
    </div>
  );
}

export function BusinessTemplatePreview({ className }: PreviewProps) {
  return (
    <div
      className={cn(
        'aspect-[210/297] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        className
      )}
    >
      <div className="-mx-3 -mt-3 mb-3 bg-slate-900 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="h-2 w-14 rounded bg-white/80" />
          <div className="h-3 w-12 rounded bg-white/40" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-1">
        <div className="h-8 rounded bg-slate-100" />
        <div className="h-8 rounded bg-slate-100" />
      </div>
      <div className="mx-1 mt-2 h-3 rounded bg-slate-800" />
      <div className="mx-1 mt-2 space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-between border-b border-slate-100 pb-1">
            <div className="h-1.5 w-20 rounded bg-slate-200" />
            <div className="h-1.5 w-8 rounded bg-slate-400" />
          </div>
        ))}
      </div>
      <div className="mx-1 ml-auto mt-3 h-6 w-16 rounded bg-slate-900" />
    </div>
  );
}

export function ProfessionalTemplatePreview({ className }: PreviewProps) {
  return (
    <div
      className={cn(
        'aspect-[210/297] overflow-hidden rounded-lg border border-emerald-100 bg-white p-3 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="h-2.5 w-16 rounded bg-emerald-600" />
          <div className="h-1.5 w-20 rounded bg-slate-200" />
          <div className="h-1 w-14 rounded bg-slate-100" />
        </div>
        <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1">
          <div className="h-2 w-10 rounded bg-emerald-600" />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-[6px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded bg-slate-50 p-1">
            <div className="h-1 w-full rounded bg-emerald-400" />
          </div>
        ))}
      </div>
      <div className="mt-2 h-3 rounded bg-emerald-600" />
      <div className="mt-2 space-y-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'flex justify-between px-1 py-0.5',
              i % 2 === 0 ? 'bg-emerald-50/50' : 'bg-white'
            )}
          >
            <div className="h-1.5 w-16 rounded bg-slate-200" />
            <div className="h-1.5 w-6 rounded bg-slate-300" />
          </div>
        ))}
      </div>
      <div className="ml-auto mt-2 h-6 w-16 rounded border border-emerald-300 bg-emerald-50" />
    </div>
  );
}

export function PdfTemplatePreview({
  template,
  className,
}: {
  template: PdfCatalogTemplateId;
  className?: string;
}) {
  switch (template) {
    case 'MODERN':
      return <ModernTemplatePreview className={className} />;
    case 'MONO':
      return <BlueProTemplatePreview className={className} />;
    case 'BLUE_PRO':
      return <BlueProTemplatePreview className={className} />;
    case 'CORPORATE':
      return <CorporateTemplatePreview className={className} />;
    case 'BUSINESS':
      return <BusinessTemplatePreview className={className} />;
    case 'PROFESSIONAL':
      return <ProfessionalTemplatePreview className={className} />;
    default:
      return <ClassicTemplatePreview className={className} />;
  }
}

/** Couleur d’accent par template catalogue (pour persistance visuelle). */
export const CATALOG_TEMPLATE_COLORS: Record<PdfCatalogTemplateId, string> = {
  CLASSIC: '#0f766e',
  MODERN: '#2563eb',
  MINIMAL: '#2f2f2f',
  MONO: '#111111',
  BLUE_PRO: '#2563eb',
  CORPORATE: '#1e3a5f',
  BUSINESS: '#1f2937',
  PROFESSIONAL: '#059669',
};

/** Résout le template catalogue actif à partir des champs org. */
export function resolveCatalogTemplate(org: {
  invoicePdfTemplate: string;
  pdfPrimaryColor: string;
}): PdfCatalogTemplateId {
  const color = org.pdfPrimaryColor?.toLowerCase();
  if (org.invoicePdfTemplate === 'MODERN') return 'MODERN';
  if (org.invoicePdfTemplate === 'MINIMAL') return 'MINIMAL';
  if (org.invoicePdfTemplate === 'MONO') return 'MONO';
  if (org.invoicePdfTemplate === 'BLUE_PRO') return 'BLUE_PRO';
  if (org.invoicePdfTemplate === 'CLASSIC') return 'CLASSIC';
  if (color === CATALOG_TEMPLATE_COLORS.CORPORATE) return 'CORPORATE';
  if (color === CATALOG_TEMPLATE_COLORS.BUSINESS) return 'BUSINESS';
  if (color === CATALOG_TEMPLATE_COLORS.PROFESSIONAL) return 'PROFESSIONAL';
  return 'CLASSIC';
}

export function catalogToBackendTemplate(
  catalogId: PdfCatalogTemplateId
): 'CLASSIC' | 'MODERN' | 'MINIMAL' | 'MONO' | 'BLUE_PRO' {
  if (catalogId === 'MODERN') return 'MODERN';
  if (catalogId === 'CLASSIC') return 'CLASSIC';
  if (catalogId === 'MONO') return 'MONO';
  if (catalogId === 'BLUE_PRO') return 'BLUE_PRO';
  return 'MINIMAL';
}
