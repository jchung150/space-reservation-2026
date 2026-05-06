'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StaffLoginPage() {
  const router = useRouter();
  const [loginId,   setLoginId]   = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!loginId.trim() || !password || loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/staff/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ loginId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '로그인에 실패했습니다.');
        return;
      }

      window.location.href = '/tasks';

    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = loginId.trim().length > 0 && password.length > 0 && !loading;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="card w-full max-w-sm p-8">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            영준피엠씨
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">업무 협업 시스템</p>
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold"
            style={{ background: 'oklch(95% 0.04 25)', color: 'oklch(62% 0.16 25)', border: '1px solid oklch(88% 0.06 25)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 아이디 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="loginId" className="text-sm font-semibold text-[var(--color-text-primary)]">
              아이디
            </label>
            <input
              id="loginId"
              type="text"
              className="input"
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              value={loginId}
              onChange={(e) => { setLoginId(e.target.value); setError(''); }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                setLoginId((e.target as HTMLInputElement).value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isComposing) pwRef.current?.focus();
              }}
              disabled={loading}
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold text-[var(--color-text-primary)]">
              비밀번호
            </label>
            <input
              id="password"
              ref={pwRef}
              type="password"
              className="input"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btn-primary mt-2 w-full"
            style={{ cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.6 }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/admin/login"
            className="text-sm text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-primary)] hover:underline"
          >
            관리자 로그인
          </Link>
        </div>
      </div>
    </main>
  );
}
