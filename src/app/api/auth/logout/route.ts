import { NextResponse } from 'next/server';
import { clearCookie } from '@/lib/auth';
import { getSession } from '@/lib/session';

export async function POST() {
  const user = await getSession();
  const redirectTo = user?.role === 'admin' ? '/admin/login' : '/login';

  const res = NextResponse.json({ ok: true, redirectTo });
  res.cookies.set(clearCookie());
  return res;
}
