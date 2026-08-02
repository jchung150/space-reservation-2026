'use client';

import { use, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ImageLightbox from '@/components/ImageLightbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  todo:           { label: '미완료',    color: C.textSec,  bg: C.pageBg    },
  in_progress:    { label: '진행 중',   color: C.primary,  bg: C.primaryBg },
  pending_review: { label: '검토 대기', color: C.pending,  bg: C.pendingBg },
  done:           { label: '완료',      color: C.success,  bg: C.successBg },
  rework:         { label: '재작업',    color: C.danger,   bg: C.dangerBg  },
};

const REPORT_STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: '검토 대기', color: C.pending,  bg: C.pendingBg },
  approved: { label: '승인 완료', color: C.success,  bg: C.successBg },
  rejected: { label: '반려됨',    color: C.danger,   bg: C.dangerBg  },
};

const REPEAT_LABEL: Record<string, string> = {
  none: '없음', daily: '매일', weekly: '매주', monthly: '매월', yearly: '매년',
};

/* ── 섹션 카드 ──────────────────────────────────────────────────── */
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
      {title && (
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: C.pageBg }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em' }}>{title}</span>
        </div>
      )}
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, width: 72, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.textPri, fontWeight: 600, flex: 1 }}>{children}</span>
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

  const queryClient = useQueryClient();
  const [lightbox,     setLightbox]     = useState<{ images: string[]; index: number } | null>(null);
  const [rejectNote,   setRejectNote]   = useState('');
  const [showReject,   setShowReject]   = useState(false);
  const [reviewErr,    setReviewErr]    = useState('');
  const [toast,        setToast]        = useState('');
  const [showHistory,  setShowHistory]  = useState(false);

  const approveMutation = useMutation({
    mutationFn: (reportId: string) =>
      fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      }).then(r => { if (!r.ok) throw new Error('승인 실패'); }),
    onSuccess: () => {
      setReviewErr('');
      queryClient.invalidateQueries({ queryKey: ['admin-task-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['archive'] });
      setToast('승인되어 아카이브에 저장되었습니다.');
      setTimeout(() => router.push('/admin/tasks'), 1500);
    },
    onError: () => setReviewErr('승인에 실패했습니다.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reportId: string) =>
      fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectReason: rejectNote }),
      }).then(r => { if (!r.ok) throw new Error('반려 실패'); }),
    onSuccess: () => { setShowReject(false); setRejectNote(''); setReviewErr(''); queryClient.invalidateQueries({ queryKey: ['admin-task-detail', id] }); },
    onError: () => setReviewErr('반려에 실패했습니다.'),
  });

  /* ── 완료 처리 ── */
  const [showComplete,   setShowComplete]   = useState(false);
  const [completeFiles,  setCompleteFiles]  = useState<{ id: string; file: File; preview: string }[]>([]);
  const [completeError,  setCompleteError]  = useState('');
  const completeInputRef = useRef<HTMLInputElement>(null);

  function addCompleteFiles(files: FileList | null) {
    if (!files) return;
    setCompleteError('');
    const VALID = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    for (const file of Array.from(files)) {
      if (completeFiles.length >= 5) break;
      if (!VALID.has(file.type) && !file.name.match(/\.(heic|heif)$/i)) continue;
      if (file.size > 10 * 1024 * 1024) {
        setCompleteError(`"${file.name}"이(가) 10MB를 초과합니다.`);
        return;
      }
      const preview = URL.createObjectURL(file);
      setCompleteFiles(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, file, preview }]);
    }
    if (completeInputRef.current) completeInputRef.current.value = '';
  }

  function removeCompleteFile(fid: string) {
    setCompleteFiles(prev => {
      const t = prev.find(i => i.id === fid);
      if (t) URL.revokeObjectURL(t.preview);
      return prev.filter(i => i.id !== fid);
    });
  }

  const completeMutation = useMutation({
    mutationFn: async () => {
      let paths: string[] = [];
      if (completeFiles.length > 0) {
        const fd = new FormData();
        for (const f of completeFiles) fd.append('images', f.file, f.file.name);
        const upload = await fetch('/api/admin/reference-images', { method: 'POST', body: fd });
        if (!upload.ok) throw new Error('사진 업로드에 실패했습니다.');
        const j = await upload.json();
        paths = j.paths ?? [];
      }
      const res = await fetch(`/api/admin/tasks/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceImages: paths }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? '완료 처리에 실패했습니다.');
      }
    },
    onSuccess: () => {
      // preview URL 해제
      completeFiles.forEach(f => URL.revokeObjectURL(f.preview));
      setCompleteFiles([]);
      setShowComplete(false);
      setToast('업무가 완료 처리되었습니다.');
      setTimeout(() => router.push('/admin/tasks'), 1500);
    },
    onError: (e: Error) => setCompleteError(e.message),
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
  const reports: any[]            = task.reports ?? [];
  const referenceImages: string[] = task.referenceImages ?? [];
  const submittedPhotos: string[] = task.submittedPhotos ?? [];

  // 가장 최근 보고
  const latestReport   = reports[0] ?? null;
  const isPending      = latestReport?.status === 'pending';
  // 반려된 보고 수 (= 이전 이력 수)
  const rejectionCount = reports.filter((r: any) => r.status === 'rejected').length;
  const canReject      = rejectionCount < 2;
  // 이력: 최신 제출 제외한 나머지 (오래된 순)
  const historyReports: any[] = reports.slice(1).reverse();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

      {/* 페이지 헤더 */}
      <div style={{ padding: '20px 32px 16px', borderBottom: `1px solid ${C.border}`, background: '#fff', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button type="button" onClick={() => router.push('/admin/tasks')}
          style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textSec, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 2 }}>업무 관리</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.textPri, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: p.color, background: p.bgColor, borderRadius: 6, padding: '5px 10px' }}>{p.label}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 6, padding: '5px 10px' }}>{s.label}</span>
          <Link href={`/admin/tasks/${id}/edit`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: C.textSec, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            수정
          </Link>
          {task.status !== 'done' && (
            <button type="button"
              onClick={() => { setCompleteError(''); setShowComplete(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: 'none', background: C.success, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(62% 0.15 160 / 30%)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              완료 처리
            </button>
          )}
        </div>
      </div>

      {/* 2컬럼 분할 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── 좌측: 업무 내용 (60%) ── */}
        <div className="admin-scroll" style={{ flex: '0 0 60%', overflowY: 'auto', padding: '24px 24px 24px 32px', borderRight: `1px solid ${C.border}` }}>

          {/* 기본 정보 */}
          <Card title="기본 정보">
            <InfoRow label="담당자">{task.employeeName || '—'}</InfoRow>
            <InfoRow label="건물">{task.buildingName || '—'}</InfoRow>
            <InfoRow label="업무 유형">{task.taskTypeName || '—'}</InfoRow>
            <InfoRow label="직군">{task.dept || '—'}</InfoRow>
            <InfoRow label="마감일시">
              <span style={{ color: new Date(task.deadline) < new Date() && task.status !== 'done' ? C.danger : C.textPri }}>
                {getFullDateTimeLabel(task.deadline)}
              </span>
            </InfoRow>
            <InfoRow label="배정자">{task.assignedByName || task.employeeName || '—'}</InfoRow>
            <InfoRow label="배정일시">{getFullDateTimeLabel(task.createdAt)}</InfoRow>
            <InfoRow label="반복">
              {task.repeatType && task.repeatType !== 'none'
                ? (REPEAT_LABEL[task.repeatType] ?? task.repeatType)
                : '—'}
            </InfoRow>
            {task.status === 'rework' && task.reworkReason && (
              <div style={{ marginTop: 12, background: C.dangerBg, border: `1px solid oklch(88% 0.06 25)`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.danger, marginBottom: 4 }}>반려 사유</div>
                <div style={{ fontSize: 13, color: C.danger, lineHeight: 1.6 }}>{task.reworkReason}</div>
              </div>
            )}
          </Card>

          {/* 업무 설명 */}
          <Card title="업무 설명">
            {task.description
              ? <p style={{ fontSize: 14, color: C.textPri, lineHeight: 1.75, whiteSpace: 'pre-line', margin: 0 }}>{task.description}</p>
              : <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>업무 설명이 없습니다.</p>
            }
          </Card>

          {/* 참고 이미지 */}
          {referenceImages.length > 0 && (
            <Card title={`참고 이미지 (${referenceImages.length}장)`}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {referenceImages.map((url, i) => (
                  <button key={i} type="button" onClick={() => setLightbox({ images: referenceImages, index: i })}
                    style={{ width: 90, height: 90, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${C.border}`, cursor: 'pointer', padding: 0 }}>
                    <img src={url} alt={`참고 이미지 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── 우측: 보고 및 검토 (40%) ── */}
        <div style={{ flex: '0 0 40%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* 보고 내용 스크롤 영역 */}
          <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 24px 24px' }}>

            {/* 보고 없음 */}
            {!latestReport && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textMuted, gap: 10, paddingTop: 60 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="9" y1="13" x2="15" y2="13"/>
                </svg>
                <span style={{ fontSize: 14 }}>아직 제출된 보고가 없습니다</span>
              </div>
            )}

            {/* 보고 있음 */}
            {latestReport && (
              <>
                {/* 완료 보고 카드 */}
                <Card title={`완료 보고 ${reports.length > 1 ? `(${reports.length}차 제출)` : ''}`}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
                    {latestReport.submittedBy} · {latestReport.timeAgo}
                  </div>
                  {latestReport.memo
                    ? <p style={{ fontSize: 14, color: C.textPri, lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line' }}>{latestReport.memo}</p>
                    : <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>메모 없음</p>
                  }
                </Card>

                {/* 이전 제출 이력 아코디언 */}
                {historyReports.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
                    <button
                      type="button"
                      onClick={() => setShowHistory(v => !v)}
                      style={{ width: '100%', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.pageBg, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em' }}>
                        이전 제출 이력 ({historyReports.length}건)
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: showHistory ? 'rotate(180deg)' : 'none', transition: '200ms ease' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    {showHistory && (
                      <div style={{ padding: '4px 0' }}>
                        {historyReports.map((r: any, i: number) => (
                          <div key={r.id} style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: C.danger, background: C.dangerBg, borderRadius: 6, padding: '2px 8px' }}>
                                {i + 1}차 제출 · 반려됨
                              </span>
                              <span style={{ fontSize: 11, color: C.textMuted }}>{r.timeAgo}</span>
                            </div>
                            {r.memo && (
                              <p style={{ fontSize: 13, color: C.textPri, margin: '0 0 8px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{r.memo}</p>
                            )}
                            {r.photos?.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                {r.photos.map((url: string, pi: number) => (
                                  <button key={pi} type="button"
                                    onClick={() => setLightbox({ images: r.photos, index: pi })}
                                    style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                                    <img src={url} alt={`${i + 1}차 제출 사진 ${pi + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                  </button>
                                ))}
                              </div>
                            )}
                            {r.rejectReason && (
                              <div style={{ background: C.dangerBg, borderRadius: 8, padding: '8px 12px', border: `1px solid oklch(88% 0.06 25)` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: C.danger, marginBottom: 3, letterSpacing: '0.04em' }}>반려 사유</div>
                                <div style={{ fontSize: 12, color: C.danger, lineHeight: 1.6 }}>{r.rejectReason}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 제출 사진 카드 */}
                {submittedPhotos.length > 0 && (
                  <Card title={`제출 사진 (${submittedPhotos.length}장)`}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {submittedPhotos.map((url, i) => (
                        <button key={i} type="button" onClick={() => setLightbox({ images: submittedPhotos, index: i })}
                          style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `1px solid ${C.border}`, cursor: 'pointer', padding: 0 }}>
                          <img src={url} alt={`제출 사진 ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </button>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* ── 검토 액션 (하단 고정) — 검토 대기일 때만 노출 ── */}
          {latestReport && isPending && (
            <div style={{ padding: '16px 32px 20px 24px', borderTop: `1px solid ${C.border}`, background: '#fff', flexShrink: 0 }}>
              {reviewErr && (
                <div style={{ marginBottom: 10, padding: '8px 12px', background: C.dangerBg, borderRadius: 8, fontSize: 12, color: C.danger, fontWeight: 600 }}>{reviewErr}</div>
              )}

              {/* 검토 대기 — 승인/반려 */}
              {isPending && !showReject && (
                <>
                  {!canReject && (
                    <div style={{ padding: '8px 12px', background: 'oklch(94% 0.04 280)', border: '1px solid oklch(80% 0.08 280)', borderRadius: 8, fontSize: 12, color: 'oklch(50% 0.12 280)', fontWeight: 600, marginBottom: 4 }}>
                      반려 2회 초과로 이 제출은 승인만 가능합니다.
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button"
                      onClick={() => { setReviewErr(''); approveMutation.mutate(latestReport.id); }}
                      disabled={approveMutation.isPending}
                      style={{ flex: canReject ? 2 : 1, padding: '12px', borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {approveMutation.isPending ? '처리 중...' : '승인'}
                    </button>
                    {canReject && (
                      <button type="button"
                        onClick={() => { setShowReject(true); setReviewErr(''); }}
                        style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1.5px solid ${C.border}`, background: '#fff', color: C.textSec, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        반려
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* 반려 사유 입력 */}
              {isPending && showReject && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3}
                    placeholder="반려 사유를 입력해주세요. 직원에게 전달됩니다."
                    style={{ width: '100%', border: `1.5px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', background: C.pageBg }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => { setShowReject(false); setRejectNote(''); }}
                      style={{ flex: 1, padding: '11px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: C.textSec, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                    <button type="button"
                      onClick={() => { if (!rejectNote.trim()) { setReviewErr('반려 사유를 입력해주세요.'); return; } rejectMutation.mutate(latestReport.id); }}
                      disabled={rejectMutation.isPending}
                      style={{ flex: 2, padding: '11px', borderRadius: 8, border: 'none', background: C.danger, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      {rejectMutation.isPending ? '처리 중...' : '반려 확인'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* 저장 완료 토스트 */}
      {toast && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'oklch(18% 0.01 260)', color: '#fff', padding: '16px 28px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 500, boxShadow: '0 8px 32px oklch(0% 0 0 / 30%)', display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(62% 0.15 160)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {toast}
        </div>
      )}

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNav={i => setLightbox({ ...lightbox, index: i })}
        />
      )}

      {/* ── 완료 처리 모달 ── */}
      {showComplete && createPortal(
        <div onClick={() => { if (!completeMutation.isPending) setShowComplete(false); }}
          style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 460, background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)', padding: '24px 24px 20px' }}>

            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPri, marginBottom: 6 }}>업무를 완료 처리하시겠습니까?</h2>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 18, lineHeight: 1.6 }}>
              직원 보고 없이 관리자가 완료 상태로 표시하고 아카이브로 이동합니다.
              필요 시 완료 사진을 첨부할 수 있습니다.
            </p>

            <input
              ref={completeInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
              multiple
              style={{ display: 'none' }}
              onChange={e => addCompleteFiles(e.target.files)}
            />

            {/* 사진 프리뷰 */}
            {completeFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {completeFiles.map(f => (
                  <div key={f.id} style={{ position: 'relative', width: 72, height: 72, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={f.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <button type="button" onClick={() => removeCompleteFile(f.id)}
                      style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', background: 'oklch(0% 0 0 / 55%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 사진 추가 버튼 */}
            {completeFiles.length < 5 && (
              <button type="button" onClick={() => completeInputRef.current?.click()}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: `1.5px dashed ${C.border}`, background: C.pageBg, color: C.textSec, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16 }}>
                {completeFiles.length === 0 ? '사진 첨부 (선택 · 최대 5장)' : `사진 더 추가 (${completeFiles.length}/5)`}
              </button>
            )}

            {completeError && (
              <p style={{ fontSize: 12, color: C.danger, fontWeight: 600, marginBottom: 12, padding: '8px 12px', background: C.dangerBg, borderRadius: 8 }}>{completeError}</p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button"
                onClick={() => { if (!completeMutation.isPending) setShowComplete(false); }}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 14, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>
                취소
              </button>
              <button type="button"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: completeMutation.isPending ? 'oklch(75% 0.08 160)' : C.success, color: '#fff', fontSize: 14, fontWeight: 700, cursor: completeMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(62% 0.15 160 / 30%)' }}>
                {completeMutation.isPending ? '처리 중...' : '완료 처리'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
