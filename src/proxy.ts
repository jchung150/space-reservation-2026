import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;

  let user = null;
  if (token) {
    try {
      user = await verifyToken(token);
    } catch {
      user = null;
    }
  }

  const { pathname } = req.nextUrl;

  // 만료·변조된 쿠키만 삭제 (세션이 없는데 토큰이 있는 경우)
  const withExpiredCookieClear = (res: NextResponse): NextResponse => {
    if (token && !user) {
      res.cookies.set({ name: COOKIE_NAME, value: '', maxAge: 0, path: '/', httpOnly: true, sameSite: 'lax' });
    }
    return res;
  };

  /* ── 관리자 전용 라우트 ─────────────────────────────────── */
  if (pathname.startsWith('/admin/') && pathname !== '/admin/login') {
    if (!user) {
      // 세션 없음 → 만료 쿠키 삭제 + 관리자 로그인
      return withExpiredCookieClear(NextResponse.redirect(new URL('/admin/login', req.url)));
    }
    if (user.role !== 'admin') {
      // 직원이 관리자 페이지 접근 → 관리자 로그인으로 안내 (쿠키 유지)
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
    return NextResponse.next();
  }

  /* ── 직원 전용 라우트 ─────────────────────────────────────  */
  const staffRoutes = ['/tasks', '/calendar', '/profile'];
  if (staffRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    if (!user) {
      // 세션 없음 → 만료 쿠키 삭제 + 직원 로그인
      return withExpiredCookieClear(NextResponse.redirect(new URL('/login', req.url)));
    }
    if (user.role !== 'staff') {
      // 관리자가 직원 페이지 접근 → 직원 로그인으로 안내 (쿠키 유지)
      return NextResponse.redirect(new URL('/login', req.url));
    }
    return NextResponse.next();
  }

  /* ── 이미 로그인된 경우 로그인 페이지 접근 차단 ────────── */
  if (pathname === '/login' && user?.role === 'staff') {
    return NextResponse.redirect(new URL('/tasks', req.url));
  }
  if (pathname === '/admin/login' && user?.role === 'admin') {
    return NextResponse.redirect(new URL('/admin/tasks', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/tasks',
    '/tasks/:path+',
    '/calendar',
    '/profile',
    '/admin/:path+',
    '/admin/login',
    '/login',
  ],
};
