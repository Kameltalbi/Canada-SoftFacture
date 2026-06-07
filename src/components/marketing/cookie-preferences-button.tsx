'use client';

interface Props {
  label: string;
}

export function CookiePreferencesButton({ label }: Props) {
  return (
    <button
      type="button"
      className="hover:text-slate-800"
      onClick={() => window.dispatchEvent(new Event('softfacture:reopen-cookies'))}
    >
      {label}
    </button>
  );
}
