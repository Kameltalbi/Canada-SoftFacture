'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Menu } from 'lucide-react';

type MobileLandingMenuLink = {
  href: string;
  label: string;
};

export function MobileLandingMenu({
  links,
  loginLabel,
  registerLabel,
}: {
  links: readonly MobileLandingMenuLink[];
  loginLabel: string;
  registerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative md:hidden">
      <button
        type="button"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="flex cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-700"
        onClick={() => setOpen((current) => !current)}
      >
        <Menu className="h-4 w-4" />
      </button>
      {open && (
        <nav className="absolute end-0 z-50 mt-2 grid w-64 gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm font-bold text-slate-800 shadow-lg">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-2 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="my-1 h-px bg-slate-200" />
          <Link
            href="/login"
            className="rounded-md bg-brand-blue px-3 py-2 text-center font-semibold text-white hover:bg-brand-blue-hover"
            onClick={() => setOpen(false)}
          >
            {loginLabel}
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-brand px-3 py-2 text-center font-semibold text-white hover:bg-brand-hover"
            onClick={() => setOpen(false)}
          >
            {registerLabel}
          </Link>
        </nav>
      )}
    </div>
  );
}
