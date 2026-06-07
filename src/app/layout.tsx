import type { ReactNode } from 'react';

/** Racine minimale — `<html>` / `<body>` sont dans `[locale]/layout.tsx` (next-intl). */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
