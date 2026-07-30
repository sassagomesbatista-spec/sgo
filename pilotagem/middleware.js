import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(req) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.get('pilotagem_session');
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
