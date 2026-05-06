import { cookies } from 'next/headers';
import { COOKIE_NAME, verifyToken, type SessionUser } from './auth';

/** 서버 컴포넌트 / Route Handler에서 현재 세션 읽기 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** 세션이 없으면 null 대신 예외 발생 (보호된 핸들러용) */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new Error('인증이 필요합니다.');
  return user;
}
