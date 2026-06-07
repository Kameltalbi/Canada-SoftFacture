'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { parseCsv } from '@/lib/csv-parse';
import {
  PRODUCT_IMPORT_FIELDS,
  defaultProductImportMapping,
  mapProductImportRows,
  type CsvImportResult,
  type ProductImportField,
  type ProductImportMapping,
} from '@/lib/product-import';

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

const PREVIEW_ROWS = 5;

export function ProductsImportModal({ open, onClose, onImported }: Props) {
  const t = useTranslations('products');
  const tc = useTranslations('common');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ProductImportMapping>(() =>
    defaultProductImportMapping([])
  );
  const [createCategories, setCreateCategories] = useState(true);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { valid, invalid } = useMemo(() => mapProductImportRows(rows, mapping), [rows, mapping]);

  function resetState() {
    setHeaders([]);
    setRows([]);
    setMapping(defaultProductImportMapping([]));
    setCreateCategories(true);
    setResult(null);
    setFileName(null);
    setPending(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function onFileChange(file: File | null) {
    if (!file) return;
    setResult(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseCsv(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(defaultProductImportMapping(parsed.headers));
    };
    reader.readAsText(file, 'UTF-8');
  }

  function setFieldColumn(field: ProductImportField, columnIndex: number | null) {
    setMapping((prev) => ({ ...prev, [field]: columnIndex }));
  }

  async function onImport() {
    if (!valid.length) return;
    setPending(true);
    try {
      const res = await apiFetch<CsvImportResult & { categoriesCreated?: number }>(
        '/products/import',
        {
          method: 'POST',
          body: JSON.stringify({ rows: valid, createMissingCategories: createCategories }),
        }
      );
      setResult(res);
      if (res.created > 0) onImported();
    } catch (e: unknown) {
      setResult({
        created: 0,
        skipped: valid.length,
        errors: [{ line: 0, message: e instanceof Error ? e.message : tc('error') }],
      });
    } finally {
      setPending(false);
    }
  }

  function fieldLabel(field: (typeof PRODUCT_IMPORT_FIELDS)[number]): string {
    const map: Record<(typeof PRODUCT_IMPORT_FIELDS)[number], string> = {
      name: t('name'),
      kind: t('kind'),
      unitPriceHt: t('unitPrice'),
      vatRate: t('taxRate'),
      unit: t('unit'),
      categoryName: t('category'),
      stockQuantity: t('stockQuantity'),
      stockAlertThreshold: t('stockAlert'),
      description: t('importDescription'),
    };
    return map[field];
  }

  function reasonLabel(reason: string): string {
    if (reason === 'missingName') return t('importErrorMissingName');
    if (reason === 'invalidPrice') return t('importErrorInvalidPrice');
    return reason;
  }

  return (
    <Modal
      open={open}
      title={t('importTitle')}
      onClose={handleClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={pending}>
            {result ? tc('back') : tc('cancel')}
          </Button>
          {!result ? (
            <Button
              type="button"
              variant="primary"
              disabled={pending || !valid.length}
              onClick={() => void onImport()}
            >
              {pending ? t('importing') : t('importConfirm', { count: valid.length })}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="mt-4 space-y-5">
        <p className="text-sm text-s-muted">{t('importHint')}</p>
        {!headers.length ? (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-s-border bg-slate-50 px-6 py-10 text-center transition hover:bg-slate-100">
            <Upload className="mb-3 h-8 w-8 text-s-muted" />
            <span className="text-sm font-medium text-s-navy">{t('importChooseFile')}</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-s-muted">
              <span>{fileName}</span>
              <span>{t('importRowCount', { count: rows.length })}</span>
            </div>
            <label className="flex items-center gap-2 text-sm text-s-navy">
              <input
                type="checkbox"
                checked={createCategories}
                onChange={(e) => setCreateCategories(e.target.checked)}
                className="rounded border-s-border"
              />
              {t('importCreateCategories')}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRODUCT_IMPORT_FIELDS.map((field) => (
                <label key={field} className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-s-muted">
                    {fieldLabel(field)}
                    {field === 'name' || field === 'unitPriceHt' ? ' *' : ''}
                  </span>
                  <select
                    value={mapping[field] ?? ''}
                    onChange={(e) =>
                      setFieldColumn(field, e.target.value === '' ? null : Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-s-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">{t('importColumnNone')}</option>
                    {headers.map((header, index) => (
                      <option key={`${header}-${index}`} value={index}>
                        {header || `#${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {invalid.length > 0 ? (
              <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                {t('importInvalidRows', { count: invalid.length })}
                <ul className="mt-1 list-inside list-disc">
                  {invalid.slice(0, 5).map((item) => (
                    <li key={`${item.line}-${item.reason}`}>
                      {t('importLine', { line: item.line })} — {reasonLabel(item.reason)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-lg border border-s-border">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead>
                  <tr className="border-b border-s-border bg-slate-50 text-s-muted">
                    <th className="px-3 py-2">{t('name')}</th>
                    <th className="px-3 py-2">{t('kind')}</th>
                    <th className="px-3 py-2">{t('unitPrice')}</th>
                    <th className="px-3 py-2">{t('category')}</th>
                    <th className="px-3 py-2">{t('stock')}</th>
                  </tr>
                </thead>
                <tbody>
                  {valid.slice(0, PREVIEW_ROWS).map((row, index) => (
                    <tr key={`${row.name}-${index}`} className="border-b border-s-border/40">
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2">
                        {row.kind === 'SERVICE' ? t('kindService') : t('kindProduct')}
                      </td>
                      <td className="px-3 py-2">{row.unitPriceHt}</td>
                      <td className="px-3 py-2">{row.categoryName ?? '—'}</td>
                      <td className="px-3 py-2">
                        {row.kind === 'SERVICE' ? t('stockNotApplicable') : row.stockQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {result ? (
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-medium">{t('importDone', { count: result.created })}</p>
            {result.skipped > 0 ? (
              <p className="mt-1 text-xs">{t('importSkipped', { count: result.skipped })}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
