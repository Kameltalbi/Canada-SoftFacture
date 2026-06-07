'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { parseCsv } from '@/lib/csv-parse';
import {
  CATEGORY_IMPORT_FIELDS,
  defaultCategoryImportMapping,
  mapCategoryImportRows,
  type CategoryImportField,
  type CategoryImportMapping,
  type CsvImportResult,
} from '@/lib/category-import';

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

const PREVIEW_ROWS = 5;

export function CategoriesImportModal({ open, onClose, onImported }: Props) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<CategoryImportMapping>(() =>
    defaultCategoryImportMapping([])
  );
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { valid, invalid } = useMemo(() => mapCategoryImportRows(rows, mapping), [rows, mapping]);

  function resetState() {
    setHeaders([]);
    setRows([]);
    setMapping(defaultCategoryImportMapping([]));
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
      setMapping(defaultCategoryImportMapping(parsed.headers));
    };
    reader.readAsText(file, 'UTF-8');
  }

  function setFieldColumn(field: CategoryImportField, columnIndex: number | null) {
    setMapping((prev) => ({ ...prev, [field]: columnIndex }));
  }

  async function onImport() {
    if (!valid.length) return;
    setPending(true);
    try {
      const res = await apiFetch<CsvImportResult>('/categories/import', {
        method: 'POST',
        body: JSON.stringify({ rows: valid }),
      });
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

  function fieldLabel(field: (typeof CATEGORY_IMPORT_FIELDS)[number]): string {
    if (field === 'name') return t('categoryNamePlaceholder');
    if (field === 'sortOrder') return t('categoryImportSortOrder');
    return field;
  }

  function reasonLabel(reason: string): string {
    if (reason === 'missingName') return t('categoryImportErrorMissingName');
    return reason;
  }

  return (
    <Modal
      open={open}
      title={t('categoryImportTitle')}
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
              {pending
                ? t('categoryImporting')
                : t('categoryImportConfirm', { count: valid.length })}
            </Button>
          ) : null}
        </>
      }
    >
      <div className="mt-4 space-y-5">
        <p className="text-sm text-s-muted">{t('categoryImportHint')}</p>
        {!headers.length ? (
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-s-border bg-slate-50 px-6 py-10 text-center transition hover:bg-slate-100">
            <Upload className="mb-3 h-8 w-8 text-s-muted" />
            <span className="text-sm font-medium text-s-navy">{t('categoryImportChooseFile')}</span>
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
              <span>{t('categoryImportRowCount', { count: rows.length })}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {CATEGORY_IMPORT_FIELDS.map((field) => (
                <label key={field} className="block text-sm">
                  <span className="mb-1 block text-xs font-medium text-s-muted">
                    {fieldLabel(field)}
                    {field === 'name' ? ' *' : ''}
                  </span>
                  <select
                    value={mapping[field] ?? ''}
                    onChange={(e) =>
                      setFieldColumn(field, e.target.value === '' ? null : Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-s-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">{t('categoryImportColumnNone')}</option>
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
              <p className="text-xs text-amber-800">
                {t('categoryImportInvalidRows', { count: invalid.length })}
              </p>
            ) : null}
            <ul className="rounded-lg border border-s-border divide-y text-sm">
              {valid.slice(0, PREVIEW_ROWS).map((row) => (
                <li key={row.name} className="px-3 py-2">
                  {row.name}
                  {row.sortOrder ? (
                    <span className="ms-2 text-xs text-s-muted">({row.sortOrder})</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
        {result ? (
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-medium">{t('categoryImportDone', { count: result.created })}</p>
            {result.skipped > 0 ? (
              <p className="mt-1 text-xs">
                {t('categoryImportSkipped', { count: result.skipped })}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
