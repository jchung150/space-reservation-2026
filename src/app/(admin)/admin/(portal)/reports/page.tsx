'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PRIORITY_CONFIG } from '@/constants/task-config';

/* ── 색상 ─────────────────────────────────────────────────────── */
const C = {
  primary:   'oklch(55% 0.14 195)',
  primaryBg: 'oklch(93% 0.06 195)',
  danger:    'oklch(62% 0.16 25)',
  success:   'oklch(62% 0.15 160)',
  successBg: 'oklch(93% 0.05 160)',
  border:    'oklch(88% 0.008 240)',
  pageBg:    'oklch(95% 0.005 220)',
  textPri:   'oklch(18% 0.01 260)',
  textSec:   'oklch(50% 0.01 260)',
  textMuted: 'oklch(65% 0.01 260)',
};

const DEPT_COLOR: Record<string, string> = {
  보안: 'oklch(65% 0.16 65)', 청소: 'oklch(62% 0.15 160)', 시설: 'oklch(55% 0.14 195)',
};

/* ── API 응답 타입 ────────────────────────────────────────────── */
interface ReportItem {
  id:           string;
  taskId:       string | null;
  status:       'pending' | 'approved';
  timeAgo:      string;
  createdAt:    string;
  employee:     string;
  dept:         string;
  task:         string;
  priority:     'high' | 'medium' | 'low';
  isNew:        boolean;
  prevRejected: boolean;
  thumbnailUrl: string | null;
}

/* ── 탭 정의 (반려됨 탭 제거) ────────────────────────────────── */
type TabKey = 'pending' | 'approved';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'pending',  label: '검토 대기' },
  { key: 'approved', label: '승인 완료' },
];

/* ── 아이콘 ─────────────────────────────────────────────────────  */
const IconClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconCamera = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconEmpty = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
  </svg>
);

/* ── 보고 카드 ──────────────────────────────────────────────────── */
function ReportCard({
  report, onReview, onArchive, archiving,
}: {
  report: ReportItem;
  onReview: () => void;
  onArchive: () => void;
  archiving: boolean;
}) {
  const p        = PRIORITY_CONFIG[report.priority];
  const deptClr  = Object.entries(DEPT_COLOR).find(([k]) => report.dept.includes(k))?.[1] ?? C.textMuted;
  const [hov, setHov] = useState(false);

  // 썸네일 색상 (직군별 구분)
  const thumbColor = deptClr + '60';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onReview}
      onKeyDown={e => e.key === 'Enter' && onReview()}
      className={report.isNew ? 'slide-down' : ''}
      style={{
        background: '#fff', borderRadius: 12, position: 'relative',
        border: `1px solid ${report.isNew ? 'oklch(75% 0.1 195)' : C.border}`,
        boxShadow: report.isNew
          ? '0 0 0 2px oklch(85% 0.08 195), 0 4px 16px oklch(55% 0.14 195 / 12%)'
          : '0 1px 4px oklch(0% 0 0 / 5%)',
        padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
        cursor: 'pointer', transition: '150ms ease',
      }}
    >
      {/* NEW 배지 */}
      {report.isNew && (
        <div style={{ position: 'absolute', top: -9, left: 16, background: C.primary, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '2px 8px', letterSpacing: '0.06em' }}>
          NEW
        </div>
      )}

      {/* 썸네일 */}
      <div style={{ width: 64, height: 64, borderRadius: 10, background: thumbColor, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {report.thumbnailUrl
          ? <img src={report.thumbnailUrl} alt="첨부 사진" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <IconCamera />
        }
      </div>

      {/* 정보 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>{report.employee}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: deptClr, background: `${deptClr}18`, borderRadius: 6, padding: '2px 8px' }}>
            {report.dept}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: p.color, background: p.bgColor, borderRadius: 6, padding: '2px 8px' }}>
            {p.label}
          </span>
          {/* 상태 배지 */}
          {report.status === 'approved' && (
            <span style={{ fontSize: 11, fontWeight: 600, color: C.success, background: 'oklch(93% 0.05 160)', borderRadius: 6, padding: '2px 8px' }}>승인 완료</span>
          )}
          {/* 이전 반려 이력 있는 재제출 보고 */}
          {report.prevRejected && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'oklch(62% 0.16 25)', background: 'oklch(95% 0.04 25)', borderRadius: 6, padding: '2px 8px', border: '1px solid oklch(85% 0.06 25)' }}>
              ↩ 재제출
            </span>
          )}
        </div>

        <div style={{ fontSize: 14, fontWeight: 600, color: C.textPri, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {report.task}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: C.textMuted }}>
          <IconClock /> {report.timeAgo} 제출
        </div>
      </div>

      {/* 액션 버튼: approved=저장하기+승인취소 */}
      {report.status === 'approved' ? (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onArchive(); }}
          disabled={archiving}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            padding: '9px 20px', borderRadius: 8, flexShrink: 0,
            border: `1.5px solid ${C.success}`,
            background: hov ? C.successBg : 'transparent',
            color: C.success, fontSize: 13, fontWeight: 700,
            cursor: archiving ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: '150ms ease', whiteSpace: 'nowrap',
            opacity: archiving ? 0.6 : 1,
          }}
        >
          {archiving ? '저장 중...' : '저장하기 →'}
        </button>
      ) : (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onReview(); }}
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            padding: '9px 20px', borderRadius: 8, flexShrink: 0,
            border: `1.5px solid ${C.primary}`,
            background: hov ? C.primaryBg : 'transparent',
            color: C.primary, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: '150ms ease', whiteSpace: 'nowrap',
          }}
        >
          검토하기 →
        </button>
      )}
    </div>
  );
}

/* ── 빈 상태 ────────────────────────────────────────────────────── */
function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12, color: C.textMuted }}>
      <IconEmpty />
      <span style={{ fontSize: 14 }}>{label}이 없습니다</span>
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────────── */
export default function ReportsPage() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [tab,           setTab]          = useState<TabKey>('pending');
  const [archivingId,   setArchivingId]  = useState<string | null>(null);

  const archiveMutation = useMutation({
    mutationFn: (reportId: string) =>
      fetch(`/api/admin/reports/${reportId}/archive`, { method: 'POST' }).then(r => {
        if (!r.ok) throw new Error('저장 실패');
      }),
    onMutate:  (id) => setArchivingId(id),
    onSettled: ()  => setArchivingId(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['archive'] });
    },
  });


  /* 실제 DB에서 보고 목록 조회 — SSE 대신 30초 폴링 */
  const { data: reports = [], isLoading, isError } = useQuery<ReportItem[]>({
    queryKey: ['admin-reports'],
    queryFn: () => fetch('/api/admin/reports').then(r => {
      if (!r.ok) throw new Error('fetch error');
      return r.json();
    }),
    staleTime: 0,
    refetchInterval: 30_000,      // 30초마다 자동 갱신 (실시간 SSE 대체)
    refetchOnWindowFocus: true,
  });

  /* 탭별 필터링 */
  const filtered: ReportItem[] = reports.filter(r => r.status === tab);

  const countOf = (k: TabKey) => reports.filter(r => r.status === k).length;

  return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri }}>완료 보고 검토</h1>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>
            직원이 제출한 완료 보고를 검토하고 승인 또는 반려하세요
          </p>
        </div>

        {/* LIVE 배지 — 30초 폴링 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'oklch(20% 0.04 160 / 8%)', border: '1px solid oklch(62% 0.15 160 / 30%)', borderRadius: 8, padding: '7px 14px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, display: 'inline-block', animation: 'pulse 1.5s ease infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: C.success, letterSpacing: '0.05em' }}>LIVE</span>
          <span style={{ fontSize: 12, color: C.textSec }}>실시간 자동 갱신 중</span>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {TABS.map(t => {
          const isActive  = tab === t.key;
          const count     = countOf(t.key);
          const badgeBg   = isActive ? (t.key === 'pending' ? C.danger : C.primary) : C.border;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: isActive ? 700 : 400, color: isActive ? C.primary : C.textSec, borderBottom: `2px solid ${isActive ? C.primary : 'transparent'}`, display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1 }}>
              {t.label}
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 7px', background: badgeBg, color: '#fff', minWidth: 20, textAlign: 'center' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 카드 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '48px', color: C.textMuted, fontSize: 14 }}>불러오는 중...</div>
        )}
        {isError && (
          <div style={{ textAlign: 'center', padding: '48px', color: C.danger, fontSize: 14 }}>보고 목록을 불러오지 못했습니다.</div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState label={TABS.find(t => t.key === tab)?.label ?? ''} />
        )}
        {filtered.map(report => (
          <ReportCard
            key={report.id}
            report={report}
            onReview={() => router.push(`/admin/tasks/${report.taskId}`)}
            onArchive={() => archiveMutation.mutate(report.id)}
            archiving={archivingId === report.id}
          />
        ))}
      </div>
    </div>
  );
}
