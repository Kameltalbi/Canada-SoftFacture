'use client';

import { useEffect, useRef } from 'react';
import { Link2, Minus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  APPEARANCE_COLOR_SWATCHES,
  DEFAULT_DOCUMENT_APPEARANCE,
  googleFontStylesheetHref,
  LOGO_SCALE_MAX,
  LOGO_SCALE_MIN,
  logoDisplaySize,
  PDF_FONT_FAMILIES,
  suggestAccentColors,
  type AppearanceDocScope,
  type AppearanceMode,
  type DocumentAppearanceConfig,
  type LogoPosition,
  type PdfFontFamily,
} from '@/lib/document-appearance';

/** Largeur du rail de personnalisation (alignée sur la référence Costructor). */
export const APPEARANCE_PANEL_WIDTH = 320;

type Props = {
  logoUrl: string | null;
  accentColor: string;
  fontFamily: PdfFontFamily;
  appearance: DocumentAppearanceConfig;
  colorLocked: boolean;
  readOnly: boolean;
  dirty: boolean;
  saving: boolean;
  onLogoChange: (file: File | null) => void;
  onLogoRemove: () => void;
  onAppearanceChange: (patch: Partial<DocumentAppearanceConfig>) => void;
  onAccentChange: (color: string) => void;
  onFontChange: (font: PdfFontFamily) => void;
  onCancel: () => void;
  onSave: () => void;
  onClose: () => void;
  isBusiness?: boolean;
  appearanceMode?: AppearanceMode;
  editScope?: AppearanceDocScope;
  onModeChange?: (mode: AppearanceMode) => void;
  onEditScopeChange?: (scope: AppearanceDocScope) => void;
  labels: {
    cancel: string;
    save: string;
    closePanel: string;
    modeUnified: string;
    modePerDoc: string;
    editScopeLabel: string;
    scopeInvoice: string;
    scopeQuote: string;
    scopeOther: string;
    perDocHint: string;
    logoTitle: string;
    logoSize: string;
    logoPositionLeft: string;
    logoPositionTop: string;
    logoPositionHeader: string;
    logoCenter: string;
    hideCompanyName: string;
    hideSlogan: string;
    hideAddress: string;
    hidePhone: string;
    hideEmail: string;
    hideWebsite: string;
    hideSiret: string;
    hideVat: string;
    colorTitle: string;
    colorCustom: string;
    colorSuggestions: string;
    colorLocked: string;
    fontTitle: string;
    changeLogo: string;
  };
};

function AppearanceCheckbox({
  id,
  checked,
  disabled,
  label,
  onChange,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-2.5 py-1.5 text-[13px] leading-snug text-slate-700',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/30"
      />
      <span>{label}</span>
    </label>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  disabled: boolean;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.id)}
          className={cn(
            'flex-1 rounded-md px-1 py-2 text-xs font-medium transition',
            value === opt.id
              ? 'bg-white text-brand-blue shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function DocumentAppearancePanel({
  logoUrl,
  accentColor,
  fontFamily,
  appearance,
  colorLocked,
  readOnly,
  dirty,
  saving,
  onLogoChange,
  onLogoRemove,
  onAppearanceChange,
  onAccentChange,
  onFontChange,
  onCancel,
  onSave,
  onClose,
  isBusiness = false,
  appearanceMode = 'unified',
  editScope = 'quote',
  onModeChange,
  onEditScopeChange,
  labels,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const suggestions = suggestAccentColors(accentColor);

  useEffect(() => {
    const id = 'doc-appearance-font';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = googleFontStylesheetHref(fontFamily);
  }, [fontFamily]);

  const positions: { id: LogoPosition; label: string }[] = [
    { id: 'left', label: labels.logoPositionLeft },
    { id: 'top', label: labels.logoPositionTop },
    { id: 'header', label: labels.logoPositionHeader },
  ];

  return (
    <aside className="flex max-h-[48vh] w-full shrink-0 flex-col overflow-hidden border-t border-slate-200 bg-white xl:h-full xl:max-h-none xl:w-[320px] xl:border-l xl:border-t-0">
      {/* En-tête : fermer + actions */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          aria-label={labels.closePanel}
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:opacity-40"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            disabled={readOnly || !dirty || saving}
            onClick={onSave}
            className="rounded-lg bg-brand-blue px-4 py-1.5 text-sm font-medium text-white transition hover:bg-brand-blue-hover disabled:opacity-40"
          >
            {saving ? '…' : labels.save}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        {isBusiness ? (
          <section className="border-b border-slate-100 px-5 py-4">
            <p className="mb-2.5 text-xs font-semibold text-slate-800">{labels.editScopeLabel}</p>
            <SegmentedControl
              options={[
                { id: 'unified' as const, label: labels.modeUnified },
                { id: 'per_document' as const, label: labels.modePerDoc },
              ]}
              value={appearanceMode}
              disabled={readOnly}
              onChange={(mode) => onModeChange?.(mode)}
            />
            {appearanceMode === 'per_document' ? (
              <>
                <div className="mt-2.5">
                  <SegmentedControl
                    options={[
                      { id: 'invoice' as const, label: labels.scopeInvoice },
                      { id: 'quote' as const, label: labels.scopeQuote },
                      { id: 'other' as const, label: labels.scopeOther },
                    ]}
                    value={editScope}
                    disabled={readOnly}
                    onChange={(scope) => onEditScopeChange?.(scope)}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  {labels.perDocHint}
                </p>
              </>
            ) : null}
          </section>
        ) : null}

        {/* Logo */}
        <section className="border-b border-slate-100 px-5 py-5">
          <h3 className="mb-3.5 text-sm font-semibold text-slate-900">{labels.logoTitle}</h3>

          <div className="relative mb-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/80">
            <div className="flex min-h-[108px] items-center justify-center p-5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="max-h-[72px] max-w-full object-contain" />
              ) : (
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => fileRef.current?.click()}
                  className="text-sm font-medium text-brand-blue hover:underline disabled:opacity-50"
                >
                  {labels.changeLogo}
                </button>
              )}
            </div>
            {logoUrl && !readOnly ? (
              <button
                type="button"
                aria-label="Supprimer le logo"
                onClick={onLogoRemove}
                className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:bg-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={readOnly}
              onChange={(e) => {
                onLogoChange(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </div>

          <p className="mb-2 text-sm text-slate-700">{labels.logoSize}</p>
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              disabled={readOnly}
              onClick={() =>
                onAppearanceChange({
                  logoScale: Math.max(LOGO_SCALE_MIN, appearance.logoScale - 10),
                })
              }
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min={LOGO_SCALE_MIN}
              max={LOGO_SCALE_MAX}
              step={5}
              disabled={readOnly}
              value={appearance.logoScale}
              onChange={(e) => onAppearanceChange({ logoScale: Number(e.target.value) })}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-blue [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-blue"
            />
            <button
              type="button"
              disabled={readOnly}
              onClick={() =>
                onAppearanceChange({
                  logoScale: Math.min(LOGO_SCALE_MAX, appearance.logoScale + 10),
                })
              }
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mb-3 text-right text-xs text-slate-400">
            {appearance.logoScale}% · {logoDisplaySize(appearance.logoScale).height}px
          </p>

          <div className="mb-4">
            <SegmentedControl
              options={positions}
              value={appearance.logoPosition}
              disabled={readOnly}
              onChange={(logoPosition) => onAppearanceChange({ logoPosition })}
            />
          </div>

          <div>
            <AppearanceCheckbox
              id="logo-centered"
              checked={appearance.logoCentered}
              disabled={readOnly}
              label={labels.logoCenter}
              onChange={(logoCentered) => onAppearanceChange({ logoCentered })}
            />
            <AppearanceCheckbox
              id="hide-company-name"
              checked={appearance.hideCompanyName}
              disabled={readOnly}
              label={labels.hideCompanyName}
              onChange={(hideCompanyName) => onAppearanceChange({ hideCompanyName })}
            />
            <AppearanceCheckbox
              id="hide-slogan"
              checked={appearance.hideSlogan}
              disabled={readOnly}
              label={labels.hideSlogan}
              onChange={(hideSlogan) => onAppearanceChange({ hideSlogan })}
            />
            <AppearanceCheckbox
              id="hide-address"
              checked={appearance.hideAddress}
              disabled={readOnly}
              label={labels.hideAddress}
              onChange={(hideAddress) => onAppearanceChange({ hideAddress })}
            />
            <AppearanceCheckbox
              id="hide-phone"
              checked={appearance.hidePhone}
              disabled={readOnly}
              label={labels.hidePhone}
              onChange={(hidePhone) => onAppearanceChange({ hidePhone })}
            />
            <AppearanceCheckbox
              id="hide-email"
              checked={appearance.hideEmail}
              disabled={readOnly}
              label={labels.hideEmail}
              onChange={(hideEmail) => onAppearanceChange({ hideEmail })}
            />
            <AppearanceCheckbox
              id="hide-website"
              checked={appearance.hideWebsite}
              disabled={readOnly}
              label={labels.hideWebsite}
              onChange={(hideWebsite) => onAppearanceChange({ hideWebsite })}
            />
            <AppearanceCheckbox
              id="hide-siret"
              checked={appearance.hideSiret}
              disabled={readOnly}
              label={labels.hideSiret}
              onChange={(hideSiret) => onAppearanceChange({ hideSiret })}
            />
            <AppearanceCheckbox
              id="hide-vat"
              checked={appearance.hideVat}
              disabled={readOnly}
              label={labels.hideVat}
              onChange={(hideVat) => onAppearanceChange({ hideVat })}
            />
          </div>
        </section>

        {/* Couleur */}
        <section className="border-b border-slate-100 px-5 py-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">{labels.colorTitle}</h3>

          {colorLocked ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {labels.colorLocked}
            </p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {APPEARANCE_COLOR_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    disabled={readOnly}
                    aria-label={color}
                    aria-pressed={accentColor.toLowerCase() === color}
                    onClick={() => onAccentChange(color)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition',
                      accentColor.toLowerCase() === color
                        ? 'border-slate-800 ring-2 ring-slate-200'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={readOnly}
                onClick={() => document.getElementById('appearance-custom-color')?.click()}
                className="mb-4 flex w-full items-center gap-3 rounded-lg py-1 text-left transition hover:bg-slate-50 disabled:opacity-50"
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-full border border-slate-200 shadow-sm"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="flex-1 text-sm text-slate-700">{labels.colorCustom}</span>
                <Pencil className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
              <input
                id="appearance-custom-color"
                type="color"
                value={accentColor}
                disabled={readOnly}
                onChange={(e) => onAccentChange(e.target.value)}
                className="sr-only"
              />

              <div>
                <p className="mb-2.5 flex items-center gap-1.5 text-sm text-slate-600">
                  <Link2 className="h-4 w-4 text-slate-400" />
                  {labels.colorSuggestions}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      disabled={readOnly}
                      aria-label={color}
                      onClick={() => onAccentChange(color)}
                      className="h-7 w-7 rounded-full border border-white shadow-sm transition hover:scale-105"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Police */}
        <section className="px-5 py-5 pb-8">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{labels.fontTitle}</h3>
          <select
            value={fontFamily}
            disabled={readOnly}
            onChange={(e) => onFontChange(e.target.value as PdfFontFamily)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            style={{ fontFamily }}
          >
            {PDF_FONT_FAMILIES.map((font) => (
              <option key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </option>
            ))}
          </select>
        </section>
      </div>
    </aside>
  );
}

export { DEFAULT_DOCUMENT_APPEARANCE };
