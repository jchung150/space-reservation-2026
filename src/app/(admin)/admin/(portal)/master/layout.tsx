'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useState, type ReactNode } from 'react';

const C = {
  primary:   'oklch(55% 0.14 195)',
  border:    'oklch(88% 0.008 240)',
  textPri:   'oklch(18% 0.01 260)',
  textSec:   'oklch(50% 0.01 260)',
  textMuted: 'oklch(65% 0.01 260)',
};

const TABS = [
  { href: '/admin/master/buildings',  label: '건물' },
  { href: '/admin/master/task-types', label: '업무 유형' },
] as const;

/* 하위 페이지가 자신의 액션 버튼을 헤더에 등록 */
export const MasterHeaderContext = createContext<{
  setAction: (node: ReactNode) => void;
}>({ setAction: () => {} });

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [action, setAction] = useState<ReactNode>(null);

  return (
    <MasterHeaderContext.Provider value={{ setAction }}>
      <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>
        {/* 페이지 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri }}>기준 정보 관리</h1>
            <p style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>
              업무 배정에 사용되는 마스터 데이터를 관리하세요
            </p>
          </div>
          <div>{action}</div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          {TABS.map(t => {
            const isActive = pathname === t.href || pathname.startsWith(t.href + '/');
            return (
              <Link
                key={t.href}
                href={t.href}
                style={{
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? C.primary : C.textSec,
                  borderBottom: `2px solid ${isActive ? C.primary : 'transparent'}`,
                  marginBottom: -1,
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </MasterHeaderContext.Provider>
  );
}
