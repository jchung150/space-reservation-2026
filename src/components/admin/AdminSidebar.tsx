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
const IconDashboard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconTasks = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="2"/>
    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const IconReports = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/>
  </svg>
);
const IconStaff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconArchive = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
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
  { key: 'dashboard', label: '대시보드',      href: '/admin/dashboard', icon: <IconDashboard /> },
  { key: 'tasks',     label: '업무 관리',      href: '/admin/tasks',     icon: <IconTasks /> },
  { key: 'reports',   label: '완료 보고 검토', href: '/admin/reports',   icon: <IconReports /> },
  { key: 'staff',     label: '인력 관리',      href: '/admin/staff',     icon: <IconStaff /> },
  { key: 'archive',   label: '아카이브',       href: '/admin/archive',   icon: <IconArchive /> },
] as const;

/* ── 사이드바 ────────────────────────────────────────────────────── */
export default function AdminSidebar() {
  const pathname    = usePathname();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  /* 검토 대기 건수 — 30초 폴링 */
  const { data: pendingCount = 0 } = useQuery<number>({
    queryKey: ['pending-report-count'],
    queryFn: async () => {
      const res  = await fetch('/api/admin/reports?status=pending');
      if (!res.ok) return 0;
      const list = await res.json();
      return Array.isArray(list) ? list.length : 0;
    },
    staleTime: 0,
    refetchInterval: 30_000,
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
              {item.key === 'reports' && pendingCount > 0 && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: isActive ? 'rgba(255,255,255,0.25)' : 'oklch(62% 0.16 25)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 6px',
                  minWidth: 16,
                  textAlign: 'center',
                }}>
                  {pendingCount}
                </span>
              )}
            </Link>
          );
        })}
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
