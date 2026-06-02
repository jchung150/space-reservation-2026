'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PRIORITY_CONFIG } from '@/constants/task-config';

/* ── 색상 ─────────────────────────────────────────────────────── */
const C = {
  primary:   'oklch(55% 0.14 195)', primaryBg: 'oklch(93% 0.06 195)',
  danger:    'oklch(62% 0.16 25)',  dangerBg:  'oklch(95% 0.04 25)',
  success:   'oklch(62% 0.15 160)', successBg: 'oklch(93% 0.05 160)',
  warning:   'oklch(65% 0.16 65)',  warningBg: 'oklch(95% 0.05 85)',
  border:    'oklch(88% 0.008 240)', pageBg: 'oklch(95% 0.005 220)',
  textPri:   'oklch(18% 0.01 260)', textSec: 'oklch(50% 0.01 260)',
  textMuted: 'oklch(65% 0.01 260)',
};

const DEPT_COLOR: Record<string, string> = {
  보안: 'oklch(65% 0.16 65)', 청소: 'oklch(62% 0.15 160)', 시설: 'oklch(55% 0.14 195)',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  todo:           { label: '미완료',    color: C.textSec,                    bg: C.pageBg    },
  in_progress:    { label: '진행 중',   color: C.primary,                    bg: C.primaryBg },
  pending_review: { label: '검토 대기', color: 'oklch(58% 0.14 280)',        bg: 'oklch(94% 0.04 280)' },
  done:           { label: '완료',      color: C.success,                    bg: C.successBg },
  rework:         { label: '재작업',    color: C.danger,                     bg: C.dangerBg  },
};

type FilterKey = 'total' | 'todo' | 'pending_review' | 'done';

const FILTER_CFG: Record<FilterKey, { label: string; color: string; sub: string }> = {
  total:          { label: '전체 업무', color: C.textPri, sub: '아카이브 업무 미포함' },
  todo:           { label: '미완료',    color: C.warning,  sub: '재작업 포함' },
  pending_review: { label: '검토 대기', color: C.primary,  sub: '즉시 검토 필요' },
  done:           { label: '완료',      color: C.success,  sub: '승인 완료' },
};

/* ── KPI 카드 ─────────────────────────────────────────────────── */
function KpiCard({
  label, value, color, sub, active, onClick,
}: {
  label: string; value: number; color: string; sub?: string;
  active: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, background: active ? color : '#fff', borderRadius: 12,
        padding: '20px 22px', minWidth: 0, textAlign: 'left', fontFamily: 'inherit',
        border: active ? 'none' : `1.5px solid ${hov ? color : C.border}`,
        boxShadow: active
          ? `0 4px 20px ${color}40`
          : hov ? `0 2px 10px ${color}20` : '0 1px 4px oklch(0% 0 0 / 5%)',
        cursor: 'pointer', transition: '150ms ease', position: 'relative', overflow: 'hidden',
      }}
    >
      {active && (
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      )}
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', marginBottom: 8, color: active ? 'rgba(255,255,255,0.8)' : C.textMuted }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, marginBottom: 6, color: active ? '#fff' : color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.65)' : C.textMuted }}>{sub}</div>}
    </button>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [dateLabel, setDateLabel] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('total');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  /* 현재 일시 */
  useEffect(() => {
    const update = () => {
      const now  = new Date();
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const hh   = String(now.getHours()).padStart(2, '0');
      const mm   = String(now.getMinutes()).padStart(2, '0');
      setDateLabel(`${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${days[now.getDay()]})  ${hh}:${mm}`);
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  /* 대시보드 데이터 */
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/admin/dashboard').then(r => r.json()),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const kpi = data?.kpi ?? { total: 0, todo: 0, pendingReview: 0, done: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTasks: any[] = data?.tasks ?? [];

  /* 선택된 필터에 따라 최대 10건 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredTasks: any[] = (() => {
    let list = allTasks;
    if (activeFilter === 'todo')           list = allTasks.filter(t => ['todo', 'rework'].includes(t.status));
    if (activeFilter === 'pending_review') list = allTasks.filter(t => t.status === 'pending_review');
    if (activeFilter === 'done')           list = allTasks.filter(t => t.status === 'done');
    return list.slice(0, 10);
  })();

  const handleCardClick = (key: FilterKey) => {
    setActiveFilter(key);
  };

  const kpiValues: Record<FilterKey, number> = {
    total:          kpi.total,
    todo:           kpi.todo,
    pending_review: kpi.pendingReview,
    done:           kpi.done,
  };

  return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri }}>대시보드</h1>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>전체 업무 현황을 한눈에 확인하세요</p>
        </div>
        <div style={{ fontSize: 13, color: C.textSec, fontWeight: 600, background: '#fff', padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>
          {dateLabel}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: C.textMuted, fontSize: 14 }}>불러오는 중...</div>
      ) : (
        <>
          {/* KPI 카드 */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
            {(Object.keys(FILTER_CFG) as FilterKey[]).map(key => (
              <KpiCard
                key={key}
                label={FILTER_CFG[key].label}
                value={kpiValues[key]}
                color={FILTER_CFG[key].color}
                sub={FILTER_CFG[key].sub}
                active={activeFilter === key}
                onClick={() => handleCardClick(key)}
              />
            ))}
          </div>

          {/* 필터된 업무 목록 */}
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              {filteredTasks.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
                  해당 업무가 없습니다
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: 'auto' }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 100 }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: C.pageBg }}>
                      {['업무명', '담당자', '마감일시', '우선순위', '상태'].map(h => (
                        <th key={h} style={{ padding: '9px 16px', fontSize: 11, fontWeight: 600, color: C.textMuted, textAlign: 'left', letterSpacing: '0.03em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {filteredTasks.map((t: any) => {
                      const p = PRIORITY_CONFIG[t.priority as 'high' | 'medium' | 'low'] ?? PRIORITY_CONFIG.medium;
                      const s = STATUS_CFG[t.status] ?? STATUS_CFG.todo;
                      const deptClr = DEPT_COLOR[t.dept] ?? C.textMuted;
                      const d = new Date(t.deadline);
                      const deadlineStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                      const isHov = hoveredRow === t.id;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => router.push(`/admin/tasks/${t.id}`)}
                          onMouseEnter={() => setHoveredRow(t.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{ borderTop: `1px solid ${C.border}`, background: isHov ? C.pageBg : 'transparent', transition: '120ms', cursor: 'pointer' }}
                        >
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: deptClr, display: 'inline-block', flexShrink: 0 }} />
                              {t.employeeName}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>{deadlineStr}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: p.color, background: p.bgColor, borderRadius: 6, padding: '3px 8px' }}>{p.label}</span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 6, padding: '3px 8px' }}>{s.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        </>
      )}
    </div>
  );
}
