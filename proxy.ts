import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, isValidSession } from '@/lib/adminAuth';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Форма входа и сам эндпоинт логина должны быть доступны без cookie
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (await isValidSession(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Требуется вход' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
