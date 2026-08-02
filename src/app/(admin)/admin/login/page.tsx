'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ── 다크 테마 색상 ─────────────────────────────────────────────── */
const C = {
  primary:    'oklch(55% 0.14 195)',
  primaryDk:  'oklch(45% 0.13 195)',
  danger:     'oklch(62% 0.16 25)',
  border:     'oklch(32% 0.03 240)',
  borderLt:   'oklch(38% 0.03 240)',
  cardBg:     'oklch(17% 0.02 240)',
  inputBg:    'oklch(20% 0.025 240)',
  textPri:    '#ffffff',
  textSec:    'oklch(65% 0.02 240)',
  textMuted:  'oklch(45% 0.02 240)',
};

/* ── 눈 아이콘 (비밀번호 토글) ──────────────────────────────────── */
function IconEye({ off }: { off: boolean }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

/* ── 오류 circle-x 아이콘 ────────────────────────────────────────── */
function IconCircleX({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

/* ── 다크 인풋 필드 ─────────────────────────────────────────────── */
function InputField({
  id, label, type, value, onChange, placeholder, error, rightSlot,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string; error?: string;
  rightSlot?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? C.danger : focused ? C.primary : C.border;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={id}
        style={{ fontSize: 13, fontWeight: 600, color: C.textSec, letterSpacing: '0.02em' }}
      >
        {label}
      </label>

      {/* 인풋 래퍼 */}
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 8, background: C.inputBg,
        transition: 'border-color 150ms ease',
        boxShadow: focused ? `0 0 0 3px ${C.primary}28` : 'none',
      }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={id === 'adminId' ? 'username' : 'current-password'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, padding: '13px 14px',
            border: 'none', outline: 'none',
            background: 'transparent',
            fontSize: 15, color: C.textPri,
            fontFamily: 'inherit',
          }}
        />
        {rightSlot && (
          <div style={{ paddingRight: 12, display: 'flex', alignItems: 'center' }}>
            {rightSlot}
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <span style={{ fontSize: 12, color: C.danger, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconCircleX size={12} /> {error}
        </span>
      )}
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────────── */
export default function AdminLoginPage() {
  const router = useRouter();

  const [id,         setId]         = useState('');
  const [pw,         setPw]         = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [shakeKey,   setShakeKey]   = useState(0); // shake 재실행 트리거

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const canSubmit = id.trim().length > 0 && pw.trim().length > 0 && !loading;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/admin/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ loginId: id, password: pw }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? '로그인에 실패했습니다.');
        setLoginError(true);
        setShakeKey((k) => k + 1);
      } else {
        window.location.href = '/admin/tasks';
      }
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.');
      setLoginError(true);
      setShakeKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    /* 전체 배경 */
    <div style={{
      minHeight: '100dvh',
      background: 'oklch(22% 0.025 240)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>

      {/* 격자 배경 */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: [
          'linear-gradient(oklch(30% 0.03 240 / 60%) 1px, transparent 1px)',
          'linear-gradient(90deg, oklch(30% 0.03 240 / 60%) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '48px 48px',
      }} />

      {/* 청록 방사형 광원 */}
      <div style={{
        position: 'fixed',
        top: -200, left: '50%',
        transform: 'translateX(-50%)',
        width: 700, height: 500,
        background: 'radial-gradient(ellipse, oklch(55% 0.14 195 / 18%) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* 로그인 카드 */}
      <div
        className="card-enter"
        style={{
          width: '100%', maxWidth: 420,
          background: C.cardBg,
          border: `1px solid ${C.borderLt}`,
          borderRadius: 16,
          boxShadow: '0 24px 64px oklch(0% 0 0 / 50%), 0 0 0 1px oklch(100% 0 0 / 4%)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* 상단 포인트 바 */}
        <div style={{
          height: 3,
          background: `linear-gradient(90deg, ${C.primary}, oklch(65% 0.12 210))`,
        }} />

        <div style={{ padding: '36px 36px 32px' }}>

          {/* 로고 + 앱명 + 배지 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            {/* 건물 아이콘 */}
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: `linear-gradient(135deg, ${C.primary}, oklch(48% 0.15 210))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
              boxShadow: '0 8px 24px oklch(55% 0.14 195 / 35%)',
              flexShrink: 0,
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>

            {/* 앱명 */}
            <div style={{ fontSize: 20, fontWeight: 700, color: C.textPri, marginBottom: 6 }}>
              영준피엠씨
            </div>

            {/* 관리자 포털 배지 */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'oklch(55% 0.14 195 / 15%)',
              border: '1px solid oklch(55% 0.14 195 / 35%)',
              borderRadius: 20, padding: '4px 12px',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.primary}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, letterSpacing: '0.04em' }}>
                업무 협업 시스템
              </span>
            </div>
          </div>

          {/* 오류 배너 */}
          {loginError && (
            <div
              key={shakeKey}
              className="shake"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'oklch(20% 0.04 25)',
                border: '1px solid oklch(35% 0.08 25)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20,
              }}
            >
              <IconCircleX size={15} />
              <span style={{ fontSize: 13, color: C.danger, fontWeight: 600 }}>
                {errorMsg || '아이디 또는 비밀번호가 올바르지 않습니다.'}
              </span>
            </div>
          )}

          {/* 입력 폼 */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              <InputField
                id="adminId"
                label="아이디"
                type="text"
                value={id}
                onChange={(e) => { setId(e.target.value); setLoginError(false); }}
                placeholder="관리자 아이디"
                error={loginError ? '아이디를 확인해주세요' : undefined}
              />
              <InputField
                id="adminPw"
                label="비밀번호"
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => { setPw(e.target.value); setLoginError(false); }}
                placeholder="비밀번호"
                error={loginError ? '비밀번호를 확인해주세요' : undefined}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: C.textMuted, padding: 0, display: 'flex',
                    }}
                  >
                    <IconEye off={!showPw} />
                  </button>
                }
              />
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 8, border: 'none',
                background: canSubmit
                  ? `linear-gradient(135deg, ${C.primary}, oklch(48% 0.15 210))`
                  : 'oklch(28% 0.02 240)',
                color: canSubmit ? '#fff' : C.textMuted,
                fontSize: 15, fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                letterSpacing: '0.02em',
                boxShadow: canSubmit ? '0 4px 16px oklch(55% 0.14 195 / 30%)' : 'none',
                transition: 'background 150ms ease, box-shadow 150ms ease, color 150ms ease',
                marginBottom: 24,
                minHeight: 48,
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 하단 구분선 + 안내 */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.7 }}>
              직원 로그인은{' '}
              <Link
                href="/login"
                style={{ color: C.primary, textDecoration: 'none', fontWeight: 600 }}
              >
                별도 주소
              </Link>
              를 이용해주세요.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
