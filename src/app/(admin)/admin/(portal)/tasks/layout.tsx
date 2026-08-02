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
  { href: '/admin/tasks',         label: '업무 목록' },
  { href: '/admin/tasks/archive', label: '아카이브' },
] as const;

/* 하위 페이지가 헤더 우측에 자기 액션 버튼을 등록 */
export const TasksHeaderContext = createContext<{
  setAction: (node: ReactNode) => void;
}>({ setAction: () => {} });

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [action, setAction] = useState<ReactNode>(null);

  /* 탭 노출 대상: 목록 페이지들만. 상세/생성/편집은 그대로 렌더 */
  const isListView =
    pathname === '/admin/tasks' ||
    pathname === '/admin/tasks/archive';

  if (!isListView) return <>{children}</>;

  return (
    <TasksHeaderContext.Provider value={{ setAction }}>
      <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri }}>업무 관리</h1>
            <p style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>업무 목록과 이력을 관리하세요</p>
          </div>
          <div>{action}</div>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          {TABS.map(t => {
            const isActive = pathname === t.href;
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
    </TasksHeaderContext.Provider>
  );
}
