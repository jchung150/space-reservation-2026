'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

const C = {
  primary:    'oklch(55% 0.14 195)', primaryBg: 'oklch(93% 0.06 195)',
  danger:     'oklch(62% 0.16 25)',  dangerBg:  'oklch(95% 0.04 25)',
  success:    'oklch(62% 0.15 160)', successBg: 'oklch(93% 0.05 160)',
  warning:    'oklch(65% 0.16 65)',  warningBg: 'oklch(95% 0.05 85)',
  pending:    'oklch(58% 0.14 280)', pendingBg: 'oklch(94% 0.04 280)',
  border:     'oklch(88% 0.008 240)', pageBg:    'oklch(95% 0.005 220)',
  textPri:    'oklch(18% 0.01 260)', textSec:   'oklch(50% 0.01 260)',
  textMuted:  'oklch(65% 0.01 260)',
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  '미완료':    { color: C.textSec, bg: C.pageBg    },
  '진행 중':   { color: C.primary, bg: C.primaryBg },
  '검토 대기': { color: C.pending, bg: C.pendingBg },
  '완료':     { color: C.success, bg: C.successBg },
  '재작업':    { color: C.danger,  bg: C.dangerBg  },
};

interface OverviewRes {
  building: {
    id:            string;
    name:          string;
    buildingTypes: string[];
    address:       string | null;
    builtAt:       string | null;
    approvedAt:    string | null;
    thumbnailUrl:  string | null;
    isActive:      boolean;
  };
  kpi: {
    totalCount:         number;
    ongoingCount:       number;
    thisMonthDoneCount: number;
    nextUpcoming:       { id: string; title: string; dDay: string } | null;
  };
  ongoing: {
    id:           string;
    title:        string;
    employee:     string;
    taskTypeName: string | null;
    deadline:     string;
    status:       string;
  }[];
  recentDone: {
    id:           string;
    title:        string;
    employee:     string;
    taskTypeName: string | null;
    completedAt:  string;
  }[];
  typeStats: { name: string; count: number }[];
}

function fmtKoDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery<OverviewRes>({
    queryKey: ['building-overview', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/buildings/${id}/overview`);
      if (!res.ok) throw new Error('fetch error');
      return res.json();
    },
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>
        불러오는 중...
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', textAlign: 'center', color: C.danger, fontSize: 14 }}>
        건물 정보를 불러오지 못했습니다.
      </div>
    );
  }

  const { building, kpi, ongoing, recentDone, typeStats } = data;

  return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>
      {/* ── 상단 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button type="button" onClick={() => router.back()}
          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSec, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 12, color: C.textMuted }}>건물 상세</span>
      </div>

      {/* ── 건물 정보 카드 ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: 24, marginBottom: 20, display: 'flex', gap: 24 }}>
        {/* 썸네일 */}
        <div style={{ width: 180, height: 180, borderRadius: 12, background: C.pageBg, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {building.thumbnailUrl ? (
            <img src={building.thumbnailUrl} alt={building.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          )}
        </div>

        {/* 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: C.textPri, margin: 0 }}>{building.name}</h1>
            {building.isActive ? (
              <span style={{ fontSize: 11, fontWeight: 700, color: C.success, background: C.successBg, borderRadius: 6, padding: '3px 8px' }}>● 활성</span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, background: C.pageBg, borderRadius: 6, padding: '3px 8px', border: `1px solid ${C.border}` }}>● 비활성</span>
            )}
          </div>

          {/* 구분 배지 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {building.buildingTypes.length > 0 ? (
              building.buildingTypes.map(t => (
                <span key={t} style={{ fontSize: 12, fontWeight: 600, color: C.textSec, background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 9px' }}>
                  {t}
                </span>
              ))
            ) : (
              <span style={{ fontSize: 12, color: C.textMuted }}>구분 미지정</span>
            )}
          </div>

          {/* 세부 정보 표 */}
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 8, columnGap: 12, fontSize: 13 }}>
            <span style={{ color: C.textMuted }}>주소</span>
            <span style={{ color: building.address ? C.textPri : C.textMuted }}>{building.address ?? '—'}</span>
            <span style={{ color: C.textMuted }}>건축일</span>
            <span style={{ color: building.builtAt ? C.textPri : C.textMuted }}>{fmtKoDate(building.builtAt)}</span>
            <span style={{ color: C.textMuted }}>사용승인일</span>
            <span style={{ color: building.approvedAt ? C.textPri : C.textMuted }}>{fmtKoDate(building.approvedAt)}</span>
          </div>
        </div>
      </div>

      {/* ── KPI 카드 4개 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KpiCard label="전체 업무"  value={`${kpi.totalCount}건`} />
        <KpiCard label="진행 중"    value={`${kpi.ongoingCount}건`} accent={C.primary} />
        <KpiCard label="이번 달 완료" value={`${kpi.thisMonthDoneCount}건`} accent={C.success} />
        <KpiCard
          label="다음 예정"
          value={kpi.nextUpcoming ? kpi.nextUpcoming.dDay : '—'}
          sub={kpi.nextUpcoming?.title ?? undefined}
          accent={C.warning}
          href={kpi.nextUpcoming ? `/admin/tasks/${kpi.nextUpcoming.id}` : undefined}
        />
      </div>

      {/* ── 섹션 1: 진행 중 업무 ── */}
      <SectionCard title="진행 중 업무" count={ongoing.length}>
        {ongoing.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>진행 중인 업무가 없습니다</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
                {['업무명', '담당자', '업무 유형', '마감일시', '상태'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.textMuted, textAlign: 'left', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ongoing.map(t => {
                const s = STATUS_STYLE[t.status] ?? STATUS_STYLE['미완료'];
                return (
                  <tr key={t.id}
                    onClick={() => router.push(`/admin/tasks/${t.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = C.pageBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer', transition: '120ms' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.textPri }}>{t.title}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>{t.employee}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>
                      {t.taskTypeName ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.textPri, background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px' }}>{t.taskTypeName}</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec, fontVariantNumeric: 'tabular-nums' }}>{t.deadline}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 6, padding: '3px 8px' }}>{t.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── 섹션 2: 최근 완료 이력 ── */}
      <SectionCard
        title="완료 이력 (최근 10건)"
        count={recentDone.length}
        action={
          <Link href={`/admin/tasks/archive?building=${encodeURIComponent(building.name)}`}
            style={{ fontSize: 12, fontWeight: 600, color: C.primary, textDecoration: 'none' }}>
            전체 보기 →
          </Link>
        }
      >
        {recentDone.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>완료된 업무가 없습니다</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
                {['업무명', '담당자', '업무 유형', '완료일시'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.textMuted, textAlign: 'left', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentDone.map(t => (
                <tr key={t.id}
                  onClick={() => router.push(`/admin/tasks/archive/${t.id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = C.pageBg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  style={{ borderTop: `1px solid ${C.border}`, cursor: 'pointer', transition: '120ms' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.textPri }}>{t.title}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>{t.employee}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {t.taskTypeName ? (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.textPri, background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 8px' }}>{t.taskTypeName}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec, fontVariantNumeric: 'tabular-nums' }}>{t.completedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* ── 섹션 3: 업무 유형별 통계 ── */}
      <SectionCard title="업무 유형별 통계" count={typeStats.length}>
        {typeStats.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: C.textMuted, fontSize: 13 }}>집계할 데이터가 없습니다</div>
        ) : (
          <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {typeStats.map(s => (
              <div key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{s.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, background: C.primaryBg, borderRadius: 10, padding: '2px 10px', minWidth: 30, textAlign: 'center' }}>{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

    </div>
  );
}

/* ── KPI 카드 ── */
function KpiCard({ label, value, sub, accent, href }: {
  label: string; value: string; sub?: string; accent?: string; href?: string;
}) {
  const inner = (
    <div style={{
      background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`,
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
      minHeight: 96, cursor: href ? 'pointer' : 'default',
      transition: '150ms ease',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 700, color: accent ?? C.textPri, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      {sub && <span style={{ fontSize: 12, color: C.textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</span>}
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link>;
  return inner;
}

/* ── 섹션 카드 ── */
function SectionCard({ title, count, action, children }: {
  title: string; count?: number; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>
          {title}
          {typeof count === 'number' && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: C.textMuted }}>({count})</span>
          )}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}
