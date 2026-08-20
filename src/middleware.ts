import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

function publicUrl(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host');
  if (host && !host.includes('localhost') && !host.startsWith('127.')) {
    url.host = host;
    const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    if (proto === 'http' || proto === 'https') {
      url.protocol = `${proto}:`;
    } else if (!host.startsWith('localhost') && !host.startsWith('127.')) {
      url.protocol = 'https:';
    }
  }
  return url;
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const legacy = pathname.match(/^\/(fr|en)(\/|$)/);
  if (legacy) {
    const nextPath = pathname.replace(/^\/(fr|en)/, '') || '/';
    return NextResponse.redirect(publicUrl(request, nextPath));
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(fr|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
