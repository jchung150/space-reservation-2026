'use client';

import { useState } from 'react';
import { getTodayLabel } from '@/lib/date';
import LogoutButton from '@/components/LogoutButton';

interface Props {
  userName: string;
  onRefresh?: () => void;
}

export default function EmployeeHeader({ userName, onRefresh }: Props) {
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    if (!onRefresh || spinning) return;
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 800);
  }

  return (
    <header
      className="flex flex-col gap-0.5 px-4 pt-4 pb-3 bg-white"
      style={{ borderBottom: '1px solid oklch(88% 0.008 240)' }}
    >
      <div className="flex items-center justify-between">
        <h1
          className="text-lg font-bold"
          style={{ color: 'oklch(18% 0.01 260)' }}
        >
          안녕하세요, {userName}님
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* 새로고침 버튼 */}
          {onRefresh && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={spinning}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 48, background: 'none', border: 'none', cursor: spinning ? 'not-allowed' : 'pointer', color: spinning ? 'oklch(55% 0.14 195)' : 'oklch(50% 0.01 260)', transition: '150ms ease' }}
              aria-label="새로고침"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: spinning ? 'spin 0.8s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
          )}

          {/* 로그아웃 버튼 */}
          <LogoutButton
            className="flex items-center gap-1.5 rounded-lg px-2 py-2 transition-colors"
            style={{ color: 'oklch(50% 0.01 260)', minHeight: 48, cursor: 'pointer' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>로그아웃</span>
          </LogoutButton>
        </div>
      </div>

      <p style={{ fontSize: 13, color: 'oklch(50% 0.01 260)' }}>
        {getTodayLabel()}
      </p>
    </header>
  );
}
