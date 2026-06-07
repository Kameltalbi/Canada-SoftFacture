'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { parseCsv } from '@/lib/csv-parse';
import {
  CLIENT_IMPORT_FIELDS,
  defaultClientImportMapping,
  mapClientImportRows,
  type ClientImportField,
  type ClientImportMapping,
} from '@/lib/client-import';

type Props = {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
};

type ImportResult = {
  created: number;
  skipped: number;
  errors: { line: number; message: string }[];
};

const PREVIEW_ROWS = 5;

export function ClientsImportModal({ open, onClose, onImported }: Props) {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ClientImportMapping>(() => defaultClientImportMapping([]));
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const { valid, invalid } = useMemo(
    () => mapClientImportRows(headers, rows, mapping),
    [headers, rows, mapping]
  );

  function resetState() {
    setHeaders([]);
    setRows([]);
    setMapping(defaultClientImportMapping([]));
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
      setMapping(defaultClientImportMapping(parsed.headers));
    };
    reader.onerror = () =>
      setResult({ created: 0, skipped: 0, errors: [{ line: 0, message: 'readError' }] });
    reader.readAsText(file, 'UTF-8');
  }

  function setFieldColumn(field: ClientImportField, columnIndex: number | null) {
    setMapping((prev) => ({ ...prev, [field]: columnIndex }));
  }

  async function onImport() {
    if (!valid.length) return;
    setPending(true);
    setResult(null);
    try {
      const res = await apiFetch<ImportResult>('/clients/import', {
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

  function reasonLabel(reason: string): string {
    if (reason === 'missingName') return t('importErrorMissingName');
    if (reason === 'invalidEmail') return t('importErrorInvalidEmail');
    if (reason === 'readError') return t('importErrorRead');
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
            <span className="mt-1 text-xs text-s-muted">{t('importFileTypes')}</span>
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

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-s-muted">
                {t('importMapping')}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {CLIENT_IMPORT_FIELDS.map((field) => (
                  <label key={field} className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-s-muted">
                      {t(field === 'taxId' ? 'taxId' : field)}
                      {field === 'name' ? ' *' : ''}
                    </span>
                    <select
                      value={mapping[field] ?? ''}
                      onChange={(e) =>
                        setFieldColumn(field, e.target.value === '' ? null : Number(e.target.value))
                      }
                      className="w-full rounded-lg border border-s-border bg-white px-3 py-2 text-sm text-s-navy"
                    >
                      <option value="">{t('importColumnNone')}</option>
                      {headers.map((header, index) => (
                        <option key={`${header}-${index}`} value={index}>
                          {header || t('importColumnIndex', { index: index + 1 })}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
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
                    <th className="px-3 py-2">{t('email')}</th>
                    <th className="px-3 py-2">{t('phone')}</th>
                    <th className="px-3 py-2">{t('taxId')}</th>
                    <th className="px-3 py-2">{t('city')}</th>
                  </tr>
                </thead>
                <tbody>
                  {valid.slice(0, PREVIEW_ROWS).map((row, index) => (
                    <tr key={`${row.name}-${index}`} className="border-b border-s-border/40">
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2">{row.email ?? '—'}</td>
                      <td className="px-3 py-2">{row.phone ?? '—'}</td>
                      <td className="px-3 py-2">{row.taxId ?? '—'}</td>
                      <td className="px-3 py-2">{row.city ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {valid.length > PREVIEW_ROWS ? (
              <p className="text-xs text-s-muted">
                {t('importPreviewMore', { count: valid.length - PREVIEW_ROWS })}
              </p>
            ) : null}
          </>
        )}

        {result ? (
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-medium">{t('importDone', { count: result.created })}</p>
            {result.skipped > 0 ? (
              <p className="mt-1 text-xs">{t('importSkipped', { count: result.skipped })}</p>
            ) : null}
            {result.errors.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-xs">
                {result.errors.slice(0, 8).map((err) => (
                  <li key={`${err.line}-${err.message}`}>
                    {err.line > 0 ? `${t('importLine', { line: err.line })} — ` : ''}
                    {err.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
