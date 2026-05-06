'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PRIORITY_CONFIG } from '@/constants/task-config';
import { getFullDateTimeLabel, getDateOnlyLabel } from '@/lib/date';

/* ── 색상 ─────────────────────────────────────────────────────── */
const C = {
  primary:   'oklch(55% 0.14 195)', primaryBg: 'oklch(93% 0.06 195)',
  danger:    'oklch(62% 0.16 25)',  dangerBg:  'oklch(95% 0.04 25)',
  success:   'oklch(62% 0.15 160)', successBg: 'oklch(93% 0.05 160)',
  pending:   'oklch(58% 0.14 280)', pendingBg: 'oklch(94% 0.04 280)',
  warning:   'oklch(65% 0.16 65)',  warningBg: 'oklch(95% 0.05 85)',
  border:    'oklch(88% 0.008 240)', pageBg: 'oklch(95% 0.005 220)',
  textPri:   'oklch(18% 0.01 260)', textSec: 'oklch(50% 0.01 260)',
  textMuted: 'oklch(65% 0.01 260)',
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  todo:           { label: '미완료',      color: C.textSec,  bg: C.pageBg    },
  in_progress:    { label: '진행 중',     color: C.primary,  bg: C.primaryBg },
  pending_review: { label: '검토 대기',   color: C.pending,  bg: C.pendingBg },
  done:           { label: '완료',        color: C.success,  bg: C.successBg },
  rework:         { label: '재작업',     color: C.danger,   bg: C.dangerBg  },
};

const REPORT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: '검토 대기', color: C.pending,  bg: C.pendingBg },
  approved: { label: '승인 완료', color: C.success,  bg: C.successBg },
  rejected: { label: '반려됨',    color: C.danger,   bg: C.dangerBg  },
};

const REPEAT_LABEL: Record<string, string> = {
  none: '없음', daily: '매일', weekly: '매주', monthly: '매월', yearly: '매년',
};
const DAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

/* ── 섹션 카드 ──────────────────────────────────────────────────── */
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
      {title && (
        <div style={{ padding: '13px 20px', borderBottom: `1px solid ${C.border}`, background: C.pageBg }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</span>
        </div>
      )}
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

/* ── 정보 행 ────────────────────────────────────────────────────── */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, width: 72, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 14, color: C.textPri, fontWeight: 600, flex: 1 }}>{children}</span>
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────────── */
export default function AdminTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();

  const { data: task, isLoading, isError } = useQuery({
    queryKey: ['admin-task-detail', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/tasks/${id}`);
      if (!res.ok) throw new Error('fetch error');
      return res.json();
    },
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ textAlign: 'center', padding: '60px', color: C.textMuted, fontSize: 14 }}>불러오는 중...</div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ textAlign: 'center', padding: '60px', color: C.danger, fontSize: 14 }}>업무를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const p   = PRIORITY_CONFIG[task.priority as 'high' | 'medium' | 'low'] ?? PRIORITY_CONFIG.medium;
  const s   = STATUS_CFG[task.status] ?? STATUS_CFG.todo;
  const reports: any[]         = task.reports ?? [];
  const referenceImages: string[] = task.referenceImages ?? [];

  return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button type="button" onClick={() => router.push('/admin/tasks')} aria-label="목록으로"
          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSec, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 4 }}>업무 관리</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</h1>
        </div>
        {/* 수정 버튼 */}
        <Link href={`/admin/tasks/${id}/edit`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: C.textSec, fontSize: 13, fontWeight: 600, textDecoration: 'none', transition: '150ms ease' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          수정
        </Link>
      </div>

      {/* 2열 레이아웃 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* 왼쪽 열 */}
        <div>
          {/* 기본 정보 */}
          <Card title="기본 정보">
            {/* 배지 행 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: p.color, background: p.bgColor, borderRadius: 6, padding: '4px 10px' }}>{p.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 6, padding: '4px 10px' }}>{s.label}</span>
            </div>

            <InfoRow label="담당 직원">{task.employeeName || '—'}</InfoRow>
            <InfoRow label="직군">{task.dept || '—'}</InfoRow>
            <InfoRow label="위치">{task.location || '—'}</InfoRow>
            <InfoRow label="마감일시">
              <span style={{ color: new Date(task.deadline) < new Date() && task.status !== 'done' ? C.danger : C.textPri }}>
                {getFullDateTimeLabel(task.deadline)}
              </span>
            </InfoRow>
            <InfoRow label="배정일">
              <span style={{ borderBottom: 'none' }}>{getDateOnlyLabel(task.createdAt)}</span>
            </InfoRow>
            {task.assignedByName && (
              <InfoRow label="배정자">{task.assignedByName}</InfoRow>
            )}

            {/* 재작업 사유 */}
            {task.status === 'rework' && task.reworkReason && (
              <div style={{ marginTop: 14, background: C.dangerBg, border: `1px solid oklch(88% 0.06 25)`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.danger, marginBottom: 6 }}>반려 사유</div>
                <div style={{ fontSize: 13, color: C.danger, lineHeight: 1.6 }}>{task.reworkReason}</div>
              </div>
            )}
          </Card>

          {/* 반복 설정 */}
          {task.repeatType && task.repeatType !== 'none' && (
            <Card title="반복 설정">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <InfoRow label="반복 주기">{REPEAT_LABEL[task.repeatType] ?? task.repeatType}</InfoRow>
                {task.repeatType === 'weekly' && task.repeatDays?.length > 0 && (
                  <InfoRow label="반복 요일">
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(task.repeatDays as number[]).map(d => (
                        <span key={d} style={{ width: 28, height: 28, borderRadius: '50%', background: C.primaryBg, color: C.primary, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {DAY_LABEL[d]}
                        </span>
                      ))}
                    </div>
                  </InfoRow>
                )}
                {task.repeatType === 'monthly' && task.repeatDate && (
                  <InfoRow label="반복 날짜">매월 {task.repeatDate}일</InfoRow>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* 오른쪽 열 */}
        <div>
          {/* 업무 지시사항 */}
          <Card title="업무 지시사항">
            {task.description ? (
              <p style={{ fontSize: 14, color: C.textPri, lineHeight: 1.75, whiteSpace: 'pre-line' }}>{task.description}</p>
            ) : (
              <p style={{ fontSize: 13, color: C.textMuted }}>업무 설명이 없습니다.</p>
            )}
          </Card>

          {/* 참고 이미지 */}
          {referenceImages.length > 0 && (
            <Card title={`참고 이미지 (${referenceImages.length}장)`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {referenceImages.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', width: 100, height: 100, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${C.border}` }}>
                    <img src={url} alt={`참고 이미지 ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* 완료 보고 목록 */}
          <Card title={`완료 보고 (${reports.length}건)`}>
            {reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: C.textMuted, fontSize: 13 }}>
                제출된 완료 보고가 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reports.map((r: any) => {
                  const rs = REPORT_STATUS_CFG[r.status] ?? REPORT_STATUS_CFG.pending;
                  return (
                    <div key={r.id} style={{ background: C.pageBg, borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: rs.color, background: rs.bg, borderRadius: 6, padding: '2px 8px' }}>{rs.label}</span>
                          <span style={{ fontSize: 12, color: C.textMuted }}>{r.submittedBy} · {r.timeAgo}</span>
                        </div>
                        <Link href={`/admin/reports/${r.id}`}
                          style={{ fontSize: 12, fontWeight: 600, color: C.primary, textDecoration: 'none' }}>
                          검토 →
                        </Link>
                      </div>
                      {r.memo && (
                        <p style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {r.memo}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
