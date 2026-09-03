import type { MetadataRoute } from 'next';

const BASE_URL = 'https://www.softfacture.ca';

/**
 * robots.txt — indexation des pages marketing/légales ;
 * blocage des zones auth, app connectée, checkout et API.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/invite',
          '/checkout',
          '/checkout/',
          '/dashboard',
          '/admin',
          '/clients',
          '/invoices',
          '/invoices/',
          '/quotes',
          '/quotes/',
          '/products',
          '/profile',
          '/settings',
          '/stock',
          '/subscription',
          '/received-invoices',
          '/received-invoices/',
          '/recurring-invoices',
          '/recurring-invoices/',
          '/recouvrement',
          '/help',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
