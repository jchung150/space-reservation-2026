'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
  todo:           { label: '미완료',    color: C.textSec,  bg: C.pageBg    },
  in_progress:    { label: '진행 중',   color: C.primary,  bg: C.primaryBg },
  pending_review: { label: '검토 대기', color: 'oklch(58% 0.14 280)', bg: 'oklch(94% 0.04 280)' },
  done:           { label: '완료',      color: C.success,  bg: C.successBg },
  rework:         { label: '재작업',    color: C.danger,   bg: C.dangerBg  },
};


/* ── KPI 카드 ─────────────────────────────────────────────────── */
function KpiCard({ label, value, color, sub, highlight = false }: {
  label: string; value: number; color: string; sub?: string; highlight?: boolean;
}) {
  return (
    <div style={{ flex: 1, background: highlight ? color : '#fff', borderRadius: 12, padding: '20px 22px', border: highlight ? 'none' : `1px solid ${C.border}`, boxShadow: highlight ? `0 4px 20px ${color}40` : '0 1px 4px oklch(0% 0 0 / 5%)', position: 'relative', overflow: 'hidden', minWidth: 0 }}>
      {highlight && <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />}
      <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.03em', marginBottom: 8, color: highlight ? 'rgba(255,255,255,0.8)' : C.textMuted }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, marginBottom: 6, color: highlight ? '#fff' : color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: highlight ? 'rgba(255,255,255,0.65)' : C.textMuted }}>{sub}</div>}
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────── */
export default function DashboardPage() {
  const [dateLabel, setDateLabel]         = useState('');
  const [hoveredRow, setHoveredRow]       = useState<string | null>(null);
  const [hoveredReport, setHoveredReport] = useState<string | null>(null);

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

  const kpi            = data?.kpi            ?? { total: 0, todo: 0, pendingReview: 0, done: 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTodayTasks:  any[] = data?.todayTasks   ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overdueTasks:   any[] = data?.overdueTasks  ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentReports:  any[] = data?.recentReports ?? [];

  const filteredTasks = allTodayTasks;

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
            <KpiCard label="전체 업무" value={kpi.total}         color={C.textPri} sub="아카이브 업무 미포함" />
            <KpiCard label="미완료"    value={kpi.todo}          color={C.warning} sub="재작업 포함" />
            <KpiCard label="검토 대기" value={kpi.pendingReview} color={C.primary} sub="즉시 검토 필요" />
            <KpiCard label="완료"      value={kpi.done}          color={C.success} sub="승인 완료" />
          </div>

          {/* 이번 주 마감 업무 */}
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>이번 주 마감 업무</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>{filteredTasks.length}건</span>
            </div>
            {filteredTasks.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>이번 주 마감 업무가 없습니다</div>
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
                  {filteredTasks.map((t: any) => {
                    const p = PRIORITY_CONFIG[t.priority as 'high' | 'medium' | 'low'] ?? PRIORITY_CONFIG.medium;
                    const s = STATUS_CFG[t.status] ?? STATUS_CFG.todo;
                    const deptClr = DEPT_COLOR[t.dept?.split('·')[0]] ?? C.textMuted;
                    const d = new Date(t.deadline);
                    const deadlineStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    return (
                      <tr key={t.id}
                        onMouseEnter={e => { setHoveredRow(t.id); e.currentTarget.style.background = C.pageBg; }}
                        onMouseLeave={e => { setHoveredRow(null); e.currentTarget.style.background = 'transparent'; }}
                        style={{ borderTop: `1px solid ${C.border}`, transition: '120ms' }}>
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

          {/* 마감 기한 초과 업무 */}
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>마감 기한 초과</span>
              <span style={{ fontSize: 12, color: overdueTasks.length > 0 ? C.danger : C.textMuted, fontWeight: overdueTasks.length > 0 ? 700 : 400 }}>
                {overdueTasks.length}건
              </span>
            </div>
            {overdueTasks.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>초과된 업무가 없습니다</div>
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
                  {overdueTasks.map((t: any) => {
                    const p = PRIORITY_CONFIG[t.priority as 'high' | 'medium' | 'low'] ?? PRIORITY_CONFIG.medium;
                    const s = STATUS_CFG[t.status] ?? STATUS_CFG.todo;
                    const d = new Date(t.deadline);
                    const deptClr = DEPT_COLOR[t.dept?.split('·')[0]] ?? C.textMuted;
                    const deadlineStr = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
                    return (
                      <tr key={t.id}
                        onMouseEnter={e => { setHoveredRow(t.id); e.currentTarget.style.background = C.pageBg; }}
                        onMouseLeave={e => { setHoveredRow(null); e.currentTarget.style.background = 'transparent'; }}
                        style={{ borderTop: `1px solid ${C.border}`, transition: '120ms' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: deptClr, display: 'inline-block', flexShrink: 0 }} />
                            {t.employeeName}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.danger }}>{deadlineStr}</td>
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

          {/* 검토 대기 보고 */}
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>검토 대기 보고</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'oklch(20% 0.04 160 / 10%)', border: '1px solid oklch(62% 0.15 160 / 30%)', borderRadius: 6, padding: '3px 10px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.success, display: 'inline-block', animation: 'pulse 1.5s ease infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.success, letterSpacing: '0.06em' }}>LIVE</span>
              </div>
            </div>
            {recentReports.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>제출된 보고가 없습니다</div>
            ) : (
              recentReports.map((r: any, i: number) => {
                const deptClr = DEPT_COLOR[r.dept?.split('·')[0]] ?? C.primary;
                const isHov   = hoveredReport === r.id;
                return (
                  <div key={r.id}
                    onMouseEnter={() => setHoveredReport(r.id)}
                    onMouseLeave={() => setHoveredReport(null)}
                    style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderTop: i > 0 ? `1px solid ${C.border}` : 'none', gap: 14, background: isHov ? C.pageBg : 'transparent', transition: '120ms' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${deptClr}18`, border: `1.5px solid ${deptClr}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: deptClr, flexShrink: 0 }}>
                      {r.employee[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 3 }}>{r.task}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{r.employee} · {r.timeAgo}</div>
                    </div>
                    <Link href={`/admin/reports/${r.id}`}
                      style={{ padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${C.primary}`, background: isHov ? C.primaryBg : 'transparent', color: C.primary, fontSize: 12, fontWeight: 700, textDecoration: 'none', flexShrink: 0, transition: '150ms ease' }}>
                      검토하기
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
