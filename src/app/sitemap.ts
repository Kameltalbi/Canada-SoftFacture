import type { MetadataRoute } from 'next';

/** Domaine canonique SoftFacture Canada (apex redirige vers www). */
const BASE_URL = 'https://www.softfacture.ca';

/**
 * Pages publiques indexables uniquement.
 * Sources : `src/app/[locale]/` — hors (app), (auth), checkout, invite.
 * `localePrefix: 'never'` → une URL par page (pas de doublons /fr|/en).
 */
const PUBLIC_PAGES: ReadonlyArray<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/tarifs', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/cgv', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/mentions-legales', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/politique-de-confidentialite', changeFrequency: 'yearly', priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: path === '/' ? `${BASE_URL}/` : `${BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
