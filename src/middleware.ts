import { NextRequest, NextResponse } from 'next/server';
import { decodeSessionPayload, SESSION_COOKIE_NAME } from '@/auth/sessionTypes';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect ambulance route
  if (pathname.startsWith('/ambulance')) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = decodeSessionPayload(token);

    if (!session || session.role !== 'AMBULANCE') {
      const loginUrl = new URL('/', req.url);
      loginUrl.searchParams.set('tab', 'ambulance');
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect hospital route
  if (pathname.startsWith('/hospital')) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = decodeSessionPayload(token);

    if (!session || session.role !== 'HOSPITAL') {
      const loginUrl = new URL('/', req.url);
      loginUrl.searchParams.set('tab', 'hospital');
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/ambulance/:path*', '/hospital/:path*'],
};
