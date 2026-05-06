import { SignJWT, jwtVerify } from 'jose';

export type UserRole  = 'staff' | 'admin';
export type AdminRole = 'super' | 'admin';

export interface SessionUser {
  id:         string;
  role:       UserRole;
  name:       string;
  jobTypes?:  string[]; // staff only
  adminRole?: AdminRole; // admin only: 'super' | 'admin'
}

const secret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'dev-fallback-secret-32-chars-minimum!!'
  );

const COOKIE_NAME = 'fm_session';
const MAX_AGE     = 60 * 60 * 24 * 30; // 30일

/* ── 토큰 발급 ─────────────────────────────────────────────── */
export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT(user as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret());
}

/* ── 토큰 검증 ─────────────────────────────────────────────── */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

/* ── 쿠키 설정값 ───────────────────────────────────────────── */
export function sessionCookie(token: string) {
  return {
    name:     COOKIE_NAME,
    value:    token,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   MAX_AGE,
    path:     '/',
  };
}

export function clearCookie() {
  return {
    name:     COOKIE_NAME,
    value:    '',
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   0,
    path:     '/',
  };
}

export { COOKIE_NAME };
