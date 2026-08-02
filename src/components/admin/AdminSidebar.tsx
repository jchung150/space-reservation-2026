'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import LogoutButton from '@/components/LogoutButton';

/* ── 색상 상수 ─────────────────────────────────────────────────── */
const SIDEBAR_BG   = 'oklch(16% 0.02 250)';
const SIDEBAR_HOV  = 'oklch(22% 0.025 250)';
const SIDEBAR_DIV  = '1px solid oklch(24% 0.02 250)';
const PRIMARY      = 'oklch(55% 0.14 195)';

/* ── 아이콘 ──────────────────────────────────────────────────────── */
const IconTasks = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="2"/>
    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const IconBuildings = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <line x1="9" y1="6" x2="9" y2="6"/><line x1="15" y1="6" x2="15" y2="6"/>
    <line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/>
    <line x1="9" y1="14" x2="9" y2="14"/><line x1="15" y1="14" x2="15" y2="14"/>
    <path d="M10 22v-4h4v4"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ── 내비게이션 아이템 정의 ────────────────────────────────────── */
const NAV_ITEMS = [
  { key: 'tasks',     label: '업무 관리',      href: '/admin/tasks',     icon: <IconTasks /> },
  { key: 'master',    label: '기준 정보 관리', href: '/admin/master',    icon: <IconBuildings /> },
] as const;

/* ── 사이드바 ────────────────────────────────────────────────────── */
export default function AdminSidebar() {
  const pathname    = usePathname();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  /* 활성 건물 목록 (사이드바 하단 그룹) */
  const { data: buildings = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['buildings-active'],
    queryFn: async () => {
      const res = await fetch('/api/admin/buildings?active=true');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: SIDEBAR_BG,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* 로고 */}
      <div style={{ padding: '24px 20px 20px', borderBottom: SIDEBAR_DIV }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: PRIMARY,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>영준피엠씨</div>
            <div style={{ fontSize: 10, color: 'oklch(50% 0.02 250)', marginTop: 1 }}>관리자 포털</div>
          </div>
        </div>
      </div>

      {/* 내비게이션 */}
      <nav
        className="admin-scroll"
        style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}
      >
        {NAV_ITEMS.map((item) => {
          // 업무 관리는 정확 매칭 + 하위(reports, archive, [id])만. 건물 상세는 별도.
          const isActive  = pathname === item.href || pathname.startsWith(item.href + '/');
          const isHovered = hoveredKey === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 2,
                background: isActive ? PRIMARY : isHovered ? SIDEBAR_HOV : 'transparent',
                color: isActive || isHovered ? '#fff' : 'oklch(60% 0.02 250)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                textDecoration: 'none',
                transition: '150ms ease',
                minHeight: 40,
              }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          );
        })}

        {/* ── 건물 그룹 ── */}
        {buildings.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 700, color: 'oklch(45% 0.02 250)', letterSpacing: '0.08em' }}>
              건물
            </div>
            {buildings.map(b => {
              const href = `/admin/buildings/${b.id}`;
              const isActive  = pathname === href || pathname.startsWith(href + '/');
              const isHovered = hoveredKey === `bldg-${b.id}`;
              return (
                <Link
                  key={b.id}
                  href={href}
                  onMouseEnter={() => setHoveredKey(`bldg-${b.id}`)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px 8px 28px',
                    borderRadius: 8,
                    marginBottom: 2,
                    background: isActive ? PRIMARY : isHovered ? SIDEBAR_HOV : 'transparent',
                    color: isActive || isHovered ? '#fff' : 'oklch(60% 0.02 250)',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    textDecoration: 'none',
                    transition: '150ms ease',
                    minHeight: 34,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {b.name}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* 관리자 정보 */}
      <div style={{
        padding: '14px 16px 20px',
        borderTop: SIDEBAR_DIV,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {/* 아바타 */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'oklch(30% 0.03 250)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'oklch(70% 0.02 250)',
          flexShrink: 0,
        }}>
          박
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>박관리</div>
          <div style={{ fontSize: 11, color: 'oklch(45% 0.02 250)' }}>관리자</div>
        </div>
        <LogoutButton
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'oklch(40% 0.02 250)',
            padding: 4, borderRadius: 4,
            display: 'flex', alignItems: 'center',
            minHeight: 32, minWidth: 32, justifyContent: 'center',
          }}
        >
          <IconLogout />
        </LogoutButton>
      </div>
    </aside>
  );
}
