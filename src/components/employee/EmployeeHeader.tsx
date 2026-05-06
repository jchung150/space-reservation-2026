'use client';

import { getTodayLabel } from '@/lib/date';
import LogoutButton from '@/components/LogoutButton';

interface Props {
  userName: string;
}

export default function EmployeeHeader({ userName }: Props) {
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

      <p style={{ fontSize: 13, color: 'oklch(50% 0.01 260)' }}>
        {getTodayLabel()}
      </p>
    </header>
  );
}
