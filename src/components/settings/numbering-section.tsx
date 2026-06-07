'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  FORMAT_TOKEN_HELP,
  NUMBER_FORMAT_PRESETS,
  previewNextDocumentNumber,
  presetKeyFromFormat,
  type NumberFormatPreset,
  type OrgNumbering,
} from '@/lib/document-numbering';

type NumberingForm = {
  invoicePrefix: string;
  quotePrefix: string;
  depositPrefix: string;
  invoiceNumberFormat: string;
  quoteNumberFormat: string;
  depositNumberFormat: string;
  invoiceResetYearly: boolean;
  quoteResetYearly: boolean;
  depositResetYearly: boolean;
  invoiceFormatPreset: NumberFormatPreset | 'CUSTOM';
  quoteFormatPreset: NumberFormatPreset | 'CUSTOM';
  depositFormatPreset: NumberFormatPreset | 'CUSTOM';
};

type NumberingSectionProps = {
  form: NumberingForm;
  company: OrgNumbering & {
    invoiceSequence?: number;
    quoteSequence?: number;
    depositSequence?: number;
  };
  readOnly: boolean;
  onChange: (patch: Partial<NumberingForm>) => void;
  onSave: () => void;
};

const PRESET_KEYS = Object.keys(NUMBER_FORMAT_PRESETS) as NumberFormatPreset[];

function NumberingBlock({
  type,
  title,
  prefixKey,
  formatKey,
  presetKey,
  resetKey,
  form,
  company,
  readOnly,
  onChange,
}: {
  type: 'invoice' | 'quote' | 'deposit';
  title: string;
  prefixKey: 'invoicePrefix' | 'quotePrefix' | 'depositPrefix';
  formatKey: 'invoiceNumberFormat' | 'quoteNumberFormat' | 'depositNumberFormat';
  presetKey: 'invoiceFormatPreset' | 'quoteFormatPreset' | 'depositFormatPreset';
  resetKey: 'invoiceResetYearly' | 'quoteResetYearly' | 'depositResetYearly';
  form: NumberingForm;
  company: OrgNumbering;
  readOnly: boolean;
  onChange: (patch: Partial<NumberingForm>) => void;
}) {
  const t = useTranslations('settings');
  const preview = useMemo(
    () =>
      previewNextDocumentNumber(
        {
          ...company,
          invoicePrefix: form.invoicePrefix,
          quotePrefix: form.quotePrefix,
          depositPrefix: form.depositPrefix,
          invoiceNumberFormat: form.invoiceNumberFormat,
          quoteNumberFormat: form.quoteNumberFormat,
          depositNumberFormat: form.depositNumberFormat,
          invoiceResetYearly: form.invoiceResetYearly,
          quoteResetYearly: form.quoteResetYearly,
          depositResetYearly: form.depositResetYearly,
        },
        type,
        new Date()
      ),
    [company, form, type]
  );

  const currentSeq =
    type === 'invoice'
      ? (company.invoiceSequence ?? 0)
      : type === 'deposit'
        ? (company.depositSequence ?? 0)
        : (company.quoteSequence ?? 0);

  return (
    <div className="rounded-xl border border-s-border bg-slate-50/80 p-5">
      <h3 className="mb-4 text-sm font-semibold text-s-navy">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-s-muted">
            {type === 'invoice'
              ? t('invoicePrefix')
              : type === 'deposit'
                ? t('depositPrefix')
                : t('quotePrefix')}
          </label>
          <Input
            value={form[prefixKey]}
            disabled={readOnly}
            onChange={(e) => onChange({ [prefixKey]: e.target.value.toUpperCase() })}
            placeholder={type === 'invoice' ? 'FAC' : type === 'deposit' ? 'ACO' : 'DEV'}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-s-muted">{t('numberFormat')}</label>
          <select
            value={form[presetKey]}
            disabled={readOnly}
            onChange={(e) => {
              const key = e.target.value as NumberFormatPreset | 'CUSTOM';
              if (key === 'CUSTOM') {
                onChange({ [presetKey]: 'CUSTOM' });
              } else {
                onChange({
                  [presetKey]: key,
                  [formatKey]: NUMBER_FORMAT_PRESETS[key],
                });
              }
            }}
            className="w-full rounded-xl border border-s-border bg-white px-4 py-2.5 text-sm text-s-navy"
          >
            {PRESET_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`preset_${key}` as 'preset_PREFIX_YEAR_SEQ4')}
              </option>
            ))}
            <option value="CUSTOM">{t('preset_CUSTOM')}</option>
          </select>
        </div>
      </div>

      {form[presetKey] === 'CUSTOM' ? (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-s-muted">
            {t('numberFormatCustom')}
          </label>
          <Input
            value={form[formatKey]}
            disabled={readOnly}
            onChange={(e) =>
              onChange({
                [formatKey]: e.target.value,
                [presetKey]: presetKeyFromFormat(e.target.value),
              })
            }
            placeholder="{PREFIX}-{YYYY}-{SEQ:4}"
          />
        </div>
      ) : null}

      <label className="mt-4 flex items-center gap-2 text-sm text-s-navy">
        <input
          type="checkbox"
          checked={form[resetKey]}
          disabled={readOnly}
          onChange={(e) => onChange({ [resetKey]: e.target.checked })}
          className="h-4 w-4 rounded border-s-border"
        />
        {t('numberResetYearly')}
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-s-border bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-s-muted">
            {t('numberNextPreview')}
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-[#1e3a8a]">{preview}</p>
        </div>
        <div className="rounded-lg border border-s-border bg-white px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-s-muted">
            {t('numberCurrentSeq')}
          </p>
          <p className="mt-1 text-sm font-medium text-s-navy">{currentSeq}</p>
        </div>
      </div>
    </div>
  );
}

export function NumberingSection({
  form,
  company,
  readOnly,
  onChange,
  onSave,
}: NumberingSectionProps) {
  const t = useTranslations('settings');

  return (
    <div className="space-y-6">
      <p className="text-sm text-s-muted">{t('numberingIntro')}</p>

      <NumberingBlock
        type="invoice"
        title={t('numberingInvoices')}
        prefixKey="invoicePrefix"
        formatKey="invoiceNumberFormat"
        presetKey="invoiceFormatPreset"
        resetKey="invoiceResetYearly"
        form={form}
        company={company}
        readOnly={readOnly}
        onChange={onChange}
      />

      <NumberingBlock
        type="quote"
        title={t('numberingQuotes')}
        prefixKey="quotePrefix"
        formatKey="quoteNumberFormat"
        presetKey="quoteFormatPreset"
        resetKey="quoteResetYearly"
        form={form}
        company={company}
        readOnly={readOnly}
        onChange={onChange}
      />

      <NumberingBlock
        type="deposit"
        title={t('numberingDeposits')}
        prefixKey="depositPrefix"
        formatKey="depositNumberFormat"
        presetKey="depositFormatPreset"
        resetKey="depositResetYearly"
        form={form}
        company={company}
        readOnly={readOnly}
        onChange={onChange}
      />

      <div className="rounded-lg border border-s-border bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-s-muted">
          {t('numberFormatHint')}
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {FORMAT_TOKEN_HELP.map((item) => (
            <li key={item.token} className="text-xs text-s-muted">
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-s-navy">
                {item.token}
              </code>{' '}
              — {t(item.descKey as 'tokenPrefix')}
            </li>
          ))}
        </ul>
      </div>

      <Button type="button" variant="primary" disabled={readOnly} onClick={onSave}>
        {t('numberingSave')}
      </Button>
    </div>
  );
}

export type { NumberingForm };
