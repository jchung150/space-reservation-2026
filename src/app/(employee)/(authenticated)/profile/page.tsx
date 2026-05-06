'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

/* ── 색상 ─────────────────────────────────────────────────────── */
const C = {
  primary:   'oklch(55% 0.14 195)',
  primaryBg: 'oklch(93% 0.06 195)',
  danger:    'oklch(62% 0.16 25)',
  dangerBg:  'oklch(95% 0.04 25)',
  success:   'oklch(62% 0.15 160)',
  successBg: 'oklch(93% 0.05 160)',
  border:    'oklch(88% 0.008 240)',
  pageBg:    'oklch(95% 0.005 220)',
  textPri:   'oklch(18% 0.01 260)',
  textSec:   'oklch(50% 0.01 260)',
  textMuted: 'oklch(65% 0.01 260)',
};

const DEPT_COLOR: Record<string, string> = {
  시설: 'oklch(55% 0.14 195)',
  청소: 'oklch(62% 0.15 160)',
  보안: 'oklch(65% 0.16 65)',
};

/* ── 프로필 API 타입 ─────────────────────────────────────────────── */
interface ProfileData {
  name: string; loginId: string; dept: string;
  phone: string; isActive: boolean; joinedAt: string;
  stats: { assigned: number; pendingReview: number; done: number; rate: number | null };
}

/* ── 계정 정보 행 ─────────────────────────────────────────────── */
function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 16px',
      borderBottom: last ? 'none' : `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 13, color: C.textSec }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.textPri, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

/* ── 업무 현황 통계 카드 ─────────────────────────────────────── */
function StatCard({
  label, value, unit, color,
}: {
  label: string; value: number; unit: string; color?: string;
}) {
  return (
    <div style={{
      flex: 1, background: '#fff', borderRadius: 12,
      border: `1px solid ${C.border}`, padding: '14px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: color ?? C.textPri, lineHeight: 1 }}>
          {value}
        </span>
        <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  );
}

/* ── 섹션 레이블 ─────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: C.textMuted,
      letterSpacing: '0.06em', marginBottom: 10, paddingLeft: 4,
    }}>
      {children}
    </div>
  );
}

/* ── 비밀번호 변경 바텀시트 ──────────────────────────────────── */
function PasswordSheet({
  onClose, onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [cur,     setCur]     = useState('');
  const [next,    setNext]    = useState('');
  const [conf,    setConf]    = useState('');
  const [err,     setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: `1.5px solid ${C.border}`, background: C.pageBg,
    fontSize: 15, color: C.textPri, outline: 'none',
    fontFamily: 'inherit',
  };

  async function submit() {
    if (!cur)            return setErr('현재 비밀번호를 입력해주세요');
    if (!next)           return setErr('새 비밀번호를 입력해주세요');
    if (next.length < 6) return setErr('새 비밀번호는 6자 이상이어야 합니다');
    if (next !== conf)   return setErr('새 비밀번호가 일치하지 않습니다');

    setLoading(true);
    try {
      const res = await fetch('/api/staff/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: cur, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error ?? '비밀번호 변경에 실패했습니다');
      onSuccess();
    } catch {
      setErr('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'oklch(0% 0 0 / 45%)',
        zIndex: 100, animation: 'fadeIn 0.2s ease',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', background: '#fff',
          borderRadius: '18px 18px 0 0',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.2, 0.64, 1)',
          maxHeight: '85dvh', overflowY: 'auto',
        }}
      >
        {/* 핸들 바 */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }} />
        </div>

        {/* 시트 헤더 */}
        <div style={{ padding: '14px 20px 8px', borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPri }}>비밀번호 변경</h2>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 3, marginBottom: 8 }}>
            안전한 새 비밀번호로 변경하세요
          </p>
        </div>

        {/* 폼 */}
        <div style={{ padding: '18px 20px 20px' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6, display: 'block' }}>현재 비밀번호</label>
            <input type="password" value={cur} onChange={(e) => { setCur(e.target.value); setErr(''); }}
              placeholder="현재 비밀번호" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6, display: 'block' }}>새 비밀번호</label>
            <input type="password" value={next} onChange={(e) => { setNext(e.target.value); setErr(''); }}
              placeholder="6자 이상" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6, display: 'block' }}>새 비밀번호 확인</label>
            <input type="password" value={conf} onChange={(e) => { setConf(e.target.value); setErr(''); }}
              placeholder="다시 한 번 입력" style={inputStyle} />
          </div>

          {/* 오류 배너 */}
          {err && (
            <div style={{
              background: C.dangerBg, border: `1px solid oklch(62% 0.16 25 / 40%)`,
              borderRadius: 10, padding: '10px 12px', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 600, color: C.danger,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {err}
            </div>
          )}

          {/* 버튼 행 */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '14px', borderRadius: 10,
                border: `1.5px solid ${C.border}`, background: '#fff',
                fontSize: 15, fontWeight: 600, color: C.textSec,
                cursor: 'pointer', fontFamily: 'inherit', minHeight: 48,
              }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              style={{
                flex: 1.4, padding: '14px', borderRadius: 10,
                border: 'none', background: loading ? 'oklch(75% 0.08 195)' : C.primary, color: '#fff',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', minHeight: 48,
                boxShadow: '0 2px 8px oklch(55% 0.14 195 / 30%)',
              }}
            >
              {loading ? '변경 중...' : '변경하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 로그아웃 확인 다이얼로그 ─────────────────────────────────── */
function LogoutDialog({
  onClose, onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'oklch(0% 0 0 / 45%)',
        zIndex: 100, animation: 'fadeIn 0.2s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 300, background: '#fff', borderRadius: 14,
          animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.2, 0.64, 1)',
          overflow: 'hidden',
        }}
      >
        {/* 아이콘 + 메시지 */}
        <div style={{ padding: '22px 20px 18px', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: C.dangerBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.danger}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.textPri, marginBottom: 6 }}>
            로그아웃 하시겠습니까?
          </div>
          <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
            로그아웃 시 다음 사용을 위해<br />다시 로그인이 필요합니다
          </div>
        </div>

        {/* 2분할 버튼 */}
        <div style={{ display: 'flex', borderTop: `1px solid ${C.border}` }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: '14px', border: 'none', background: 'transparent',
              fontSize: 15, fontWeight: 600, color: C.textSec,
              cursor: 'pointer', fontFamily: 'inherit',
              borderRight: `1px solid ${C.border}`, minHeight: 48,
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1, padding: '14px', border: 'none', background: 'transparent',
              fontSize: 15, fontWeight: 700, color: C.danger,
              cursor: 'pointer', fontFamily: 'inherit', minHeight: 48,
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 성공 토스트 ─────────────────────────────────────────────── */
function Toast({ msg }: { msg: string }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 80, left: '50%', transform: 'translateX(-50%)',
      background: C.textPri, color: '#fff',
      padding: '10px 18px', borderRadius: 10,
      fontSize: 13, fontWeight: 600, zIndex: 200,
      boxShadow: '0 4px 16px oklch(0% 0 0 / 25%)',
      display: 'flex', alignItems: 'center', gap: 6,
      animation: 'fadeIn 0.2s ease',
      whiteSpace: 'nowrap',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.success}
        strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      {msg}
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────── */
export default function ProfilePage() {
  const router = useRouter();

  /* 실 프로필 데이터 */
  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['staff-profile'],
    queryFn: () => fetch('/api/staff/profile').then(r => r.json()),
    staleTime: 0,
  });

  const dc = DEPT_COLOR[profile?.dept?.split('·')[0] ?? ''] ?? C.primary;

  const [pwSheet,    setPwSheet]    = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [toast,      setToast]      = useState('');

  function handlePwSuccess() {
    setPwSheet(false);
    setToast('비밀번호가 변경되었습니다');
    setTimeout(() => setToast(''), 2400);
  }

  async function handleLogoutConfirm() {
    setLogoutOpen(false);
    try {
      const res  = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json();
      router.push(data.redirectTo ?? '/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.pageBg }}>

      {/* 헤더 */}
      <header style={{
        padding: '16px',
        background: '#fff', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: C.textPri }}>내 정보</h1>
      </header>

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── 프로필 카드 ── */}
        <div style={{
          background: `linear-gradient(180deg, #ffffff 0%, ${C.pageBg} 100%)`,
          padding: '28px 20px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          borderBottom: `1px solid ${C.border}`,
        }}>
          {/* 아바타 */}
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: `${dc}18`, border: `3px solid ${dc}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 700, color: dc,
            boxShadow: `0 4px 16px ${dc}30`,
          }}>
            {(profile?.name ?? "?")[0]}
          </div>

          {/* 이름 */}
          <div style={{ fontSize: 22, fontWeight: 700, color: C.textPri }}>{(profile?.name ?? "...")}</div>

          {/* 배지 */}
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600, color: dc,
              background: `${dc}18`, borderRadius: 6, padding: '4px 10px',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: dc }} />
              {(profile?.dept ?? "—")}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: C.success,
              background: C.successBg, borderRadius: 6, padding: '4px 10px',
            }}>
              ● 활성
            </span>
          </div>
        </div>

        {/* ── 계정 정보 ── */}
        <div style={{ padding: '18px 16px 4px' }}>
          <SectionLabel>계정 정보</SectionLabel>
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}` }}>
            <InfoRow label="아이디"  value={(profile?.loginId ?? "—")} />
            <InfoRow label="연락처"  value={(profile?.phone ?? "—")} />
            <InfoRow label="직군"    value={(profile?.dept ?? "—")} />
            <InfoRow label="가입일"  value={(profile?.joinedAt ?? "—")} last />
          </div>
        </div>

        {/* ── 업무 현황 ── */}
        <div style={{ padding: '18px 16px 4px' }}>
          <SectionLabel>나의 업무 현황 · 이번 달</SectionLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            <StatCard label="배정"      value={(profile?.stats.assigned      ?? 0)} unit="건" />
            <StatCard label="검토 대기" value={(profile?.stats.pendingReview ?? 0)} unit="건" color='oklch(58% 0.14 280)' />
            <StatCard label="완료"      value={(profile?.stats.done          ?? 0)} unit="건" color={C.success} />
            <StatCard label="완료율"    value={(profile?.stats.rate          ?? 0)} unit="%"  color={C.primary} />
          </div>
        </div>

        {/* ── 액션 버튼 ── */}
        <div style={{ padding: '24px 16px 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 비밀번호 변경 */}
          <button
            type="button"
            onClick={() => setPwSheet(true)}
            style={{
              padding: '14px', borderRadius: 10, minHeight: 48,
              border: `1.5px solid ${C.border}`, background: '#fff',
              fontSize: 15, fontWeight: 600, color: C.textPri,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            비밀번호 변경
          </button>

          {/* 로그아웃 */}
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            style={{
              padding: '14px', borderRadius: 10, minHeight: 48,
              border: `1.5px solid ${C.danger}`, background: C.dangerBg,
              fontSize: 15, fontWeight: 700, color: C.danger,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            로그아웃
          </button>
        </div>

        {/* 앱 버전 */}
        <div style={{ textAlign: 'center', padding: '4px 16px 24px', fontSize: 11, color: C.textMuted }}>
          영준피엠씨 시설관리 · v1.0.0
        </div>
      </div>

      {/* ── 비밀번호 변경 바텀시트 ── */}
      {pwSheet && (
        <PasswordSheet
          onClose={() => setPwSheet(false)}
          onSuccess={handlePwSuccess}
        />
      )}

      {/* ── 로그아웃 확인 다이얼로그 ── */}
      {logoutOpen && (
        <LogoutDialog
          onClose={() => setLogoutOpen(false)}
          onConfirm={handleLogoutConfirm}
        />
      )}

      {/* ── 성공 토스트 ── */}
      {toast && <Toast msg={toast} />}
    </div>
  );
}
