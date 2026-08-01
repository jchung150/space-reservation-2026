'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PRIORITY_CONFIG } from '@/constants/task-config';

const DEPT_COLOR: Record<string, string> = {
  보안: 'oklch(65% 0.16 65)', 청소: 'oklch(62% 0.15 160)', 시설: 'oklch(55% 0.14 195)',
};

// 사진 실제 URL 없을 때 사용하는 플레이스홀더 색상 (Supabase Storage 연동 전)
const PHOTO_COLORS = [
  'oklch(72% 0.09 195)', 'oklch(75% 0.09 145)',
  'oklch(78% 0.08 50)',  'oklch(72% 0.09 280)',
  'oklch(79% 0.07 25)',
];

/* ── 색상 ─────────────────────────────────────────────────────── */
const C = {
  primary:   'oklch(55% 0.14 195)',
  primaryBg: 'oklch(93% 0.06 195)',
  danger:    'oklch(62% 0.16 25)',
  dangerBg:  'oklch(95% 0.04 25)',
  success:   'oklch(62% 0.15 160)',
  successBg: 'oklch(92% 0.06 160)',
  border:    'oklch(88% 0.008 240)',
  pageBg:    'oklch(95% 0.005 220)',
  textPri:   'oklch(18% 0.01 260)',
  textSec:   'oklch(50% 0.01 260)',
  textMuted: 'oklch(65% 0.01 260)',
};

/* ── 아이콘 ─────────────────────────────────────────────────────── */
const IconUser = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconCamera = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconCheck = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconCircleX = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);
const IconExpand = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
  </svg>
);
const IconChevLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

/* ── 원본 업무 정보 행 ────────────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, width: 64 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.textPri, fontWeight: 600, flex: 1 }}>{value}</span>
    </div>
  );
}

/* ── 섹션 카드 헤더 ──────────────────────────────────────────────── */
function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '13px 16px', background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.textSec, letterSpacing: '0.04em' }}>
        {children}
      </span>
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────────── */
export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const queryClient = useQueryClient();

  /* ── API 데이터 ── */
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report', id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/reports/${id}`);
      if (res.status === 404) throw Object.assign(new Error('not-found'), { status: 404 });
      if (!res.ok) throw new Error('fetch error');
      return res.json();
    },
    staleTime: 0,
    retry: false,
  });

  /* ── 상태 ── */
  const [photoIdx,      setPhotoIdx]      = useState(0);
  const [lightbox,      setLightbox]      = useState(false);
  const [rejectOpen,    setRejectOpen]    = useState(false);
  const [rejectNote,    setRejectNote]    = useState('');
  const [rejectErr,     setRejectErr]     = useState(false);
  const [rejectFocused, setRejectFocused] = useState(false);
  const [result,        setResult]        = useState<'approved' | 'rejected' | null>(null);
  const [approveHov,    setApproveHov]    = useState(false);
  const [apiErr,        setApiErr]        = useState('');

  /* ── 승인/반려 뮤테이션 ── */
  const reviewMutation = useMutation({
    mutationFn: async ({ action, rejectReason }: { action: 'approve' | 'reject'; rejectReason?: string }) => {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejectReason }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? '처리에 실패했습니다.');
      }
    },
    onSuccess: (_, { action }) => {
      setResult(action === 'approve' ? 'approved' : 'rejected');
      setRejectOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (err: Error) => setApiErr(err.message),
  });

  /* ── 로딩 / 오류 ── */
  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted, fontSize: 14 }}>불러오는 중...</div>
      </div>
    );
  }
  if (isError || !report) {
    return (
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.danger, fontSize: 14 }}>보고를 찾을 수 없습니다.</div>
      </div>
    );
  }

  const p       = PRIORITY_CONFIG[report.priority as 'high' | 'medium' | 'low'] ?? PRIORITY_CONFIG.medium;
  const deptClr = Object.entries(DEPT_COLOR).find(([k]) => report.dept?.includes(k))?.[1] ?? C.textMuted;
  const photos: Array<{ id: string; storagePath: string; fileName: string; url: string | null }> =
    report.photos ?? [];
  const rejectionCount: number = report.rejectionCount ?? 0;
  const canReject = rejectionCount < 2;
  const previousRejections: Array<{ memo: string; rejectReason: string; submittedAt: string; rejectedAt: string }> =
    report.previousRejections ?? [];

  /* ── 핸들러 ── */
  function handleApprove() {
    setApiErr('');
    reviewMutation.mutate({ action: 'approve' });
  }
  function handleReject() {
    if (!rejectNote.trim()) { setRejectErr(true); return; }
    setApiErr('');
    reviewMutation.mutate({ action: 'reject', rejectReason: rejectNote });
  }

  return (
    <>
      {/* 2-컬럼 스플릿 패널 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>

        {/* ── 좌측: 제출 내용 ── */}
        <div
          className="admin-scroll"
          style={{
            flex: '0 0 55%',
            overflowY: 'auto',
            padding: '28px 24px 28px 32px',
            borderRight: `1px solid ${C.border}`,
          }}
        >
          {/* 뒤로 + 브레드크럼 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button
              type="button"
              onClick={() => router.push('/admin/reports')}
              aria-label="완료 보고 검토 목록으로 돌아가기"
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: `1px solid ${C.border}`, background: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: C.textSec, flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span
              style={{ fontSize: 13, color: C.textSec, cursor: 'pointer' }}
              onClick={() => router.push('/admin/reports')}
            >
              완료 보고 검토 목록
            </span>
          </div>

          {/* 배지 + 업무명 + 제출자 */}
          <div style={{ marginBottom: 20 }}>
            {/* 배지 행 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: p.color, background: p.bgColor, borderRadius: 6, padding: '3px 10px' }}>
                {p.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: deptClr, background: `${deptClr}18`, borderRadius: 6, padding: '3px 10px' }}>
                {report.dept}
              </span>
            </div>

            {/* 업무명 */}
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri, lineHeight: 1.4, marginBottom: 8 }}>
              {report.task}
            </h1>

            {/* 직원 + 제출시각 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: C.textSec, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconUser /> {report.employee}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconClock /> {report.timeAgo} 제출
              </span>
            </div>
          </div>

          {/* ── 사진 갤러리 ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textSec, marginBottom: 10, letterSpacing: '0.03em' }}>
              직원 제출 사진 ({photos.length}장)
            </div>

            {/* 메인 사진 */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setLightbox(true)}
              onKeyDown={(e) => e.key === 'Enter' && setLightbox(true)}
              style={{
                width: '100%', height: 240, borderRadius: 12,
                background: PHOTO_COLORS[photoIdx % PHOTO_COLORS.length],
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
                marginBottom: 10, overflow: 'hidden', outline: 'none',
              }}
            >
              {photos[photoIdx]?.url
                ? <img src={photos[photoIdx].url!} alt={`사진 ${photoIdx + 1}`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                : <>
                    <IconCamera />
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 8 }}>
                      {`사진 ${photoIdx + 1}`}
                    </span>
                  </>
              }

              {/* 확대 아이콘 */}
              <div style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,0.3)', borderRadius: 6,
                padding: 6, display: 'flex',
              }}>
                <IconExpand />
              </div>

              {/* 이전 */}
              {photoIdx > 0 && (
                <button
                  type="button"
                  aria-label="이전 사진"
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => i - 1); }}
                  style={{
                    position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.35)', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <IconChevLeft />
                </button>
              )}

              {/* 다음 */}
              {photoIdx < photos.length - 1 && (
                <button
                  type="button"
                  aria-label="다음 사진"
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => i + 1); }}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.35)', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <IconChevRight />
                </button>
              )}
            </div>

            {/* 썸네일 */}
            <div style={{ display: 'flex', gap: 8 }}>
              {photos.map((ph, i) => (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPhotoIdx(i)}
                  onKeyDown={(e) => e.key === 'Enter' && setPhotoIdx(i)}
                  style={{
                    width: 72, height: 52, borderRadius: 8,
                    background: PHOTO_COLORS[i % PHOTO_COLORS.length], cursor: 'pointer', flexShrink: 0,
                    border: `2px solid ${photoIdx === i ? C.primary : 'transparent'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: '150ms ease', outline: 'none', overflow: 'hidden', position: 'relative',
                  }}
                >
                  {ph.url
                    ? <img src={ph.url} alt={`사진 ${i + 1}`}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)' }}>{`사진 ${i + 1}`}</span>
                  }
                </div>
              ))}
            </div>
          </div>

          {/* ── 직원 메모 ── */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textSec, marginBottom: 10, letterSpacing: '0.03em' }}>
              직원 메모
            </div>
            <div style={{
              background: C.pageBg, borderRadius: 10,
              border: `1px solid ${C.border}`,
              padding: '14px 16px', fontSize: 14,
              color: C.textPri, lineHeight: 1.75,
              whiteSpace: 'pre-line',
            }}>
              {report.memo}
            </div>
          </div>

          {/* ── 이전 제출 이력 ── */}
          {previousRejections.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textSec, marginBottom: 10, letterSpacing: '0.03em' }}>
                이전 제출 이력
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {previousRejections.map((pr, i) => (
                  <div key={i} style={{ background: C.pageBg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: C.dangerBg, borderBottom: `1px solid oklch(88% 0.06 25)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.danger }}>{i + 1}차 제출 · 반려됨</span>
                      <span style={{ fontSize: 11, color: 'oklch(55% 0.1 25)' }}>{pr.submittedAt}</span>
                    </div>
                    <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pr.memo && (
                        <p style={{ margin: 0, fontSize: 13, color: C.textPri, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{pr.memo}</p>
                      )}
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.danger, marginBottom: 3, letterSpacing: '0.04em' }}>반려 사유</div>
                        <div style={{ fontSize: 12, color: C.danger, lineHeight: 1.6 }}>{pr.rejectReason}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 우측: 처리 패널 ── */}
        <div
          className="admin-scroll"
          style={{
            flex: '0 0 45%',
            overflowY: 'auto',
            padding: '28px 32px 28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* 원본 업무 정보 카드 */}
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            <CardHeader>원본 업무 정보</CardHeader>
            <div style={{ padding: '4px 16px 8px' }}>
              <InfoRow label="업무 설명" value={report.taskDescription ?? '—'} />
              <InfoRow label="건물"      value={report.taskBuilding    ?? '—'} />
              <InfoRow label="업무 유형" value={report.taskTypeName    ?? '—'} />
              <InfoRow label="마감일시"  value={report.taskDue         ?? '—'} />
              <InfoRow label="배정일시"   value={report.taskAssignedAt  ?? '—'} />
            </div>
            {/* 참고 이미지 */}
            {(report.referenceImages ?? []).length > 0 && (
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>
                  참고 이미지 ({report.referenceImages.length}장)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {report.referenceImages.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'block', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
                      <img src={url} alt={`참고 이미지 ${i + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 검토 처리 카드 */}
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', flex: 1 }}>
            <CardHeader>검토 처리</CardHeader>
            <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* ── 처리 결과 배너 ── */}
              {result === 'approved' && (
                <div
                  className="result-banner"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: C.successBg,
                    border: '1px solid oklch(75% 0.1 160)',
                    borderRadius: 10, padding: '14px 16px',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.success }}>완료 확정되었습니다.</div>
                    <div style={{ fontSize: 12, color: 'oklch(48% 0.12 160)', marginTop: 2 }}>직원에게 승인 결과가 전달됩니다.</div>
                  </div>
                </div>
              )}

              {result === 'rejected' && (
                <div
                  className="result-banner"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: C.dangerBg,
                    border: '1px solid oklch(78% 0.1 25)',
                    borderRadius: 10, padding: '14px 16px',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.danger }}>재작업 요청이 전달되었습니다.</div>
                    <div style={{ fontSize: 12, color: 'oklch(48% 0.12 25)', marginTop: 2 }}>직원이 재작업 후 다시 보고합니다.</div>
                  </div>
                </div>
              )}

              {/* ── 검토 전 액션 ── */}
              {!result && (
                <>
                  {/* 안내 문구 */}
                  <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.6 }}>
                    제출된 완료 보고를 검토한 후 처리 결과를 선택해주세요.
                  </div>

                  {/* API 오류 */}
                  {apiErr && (
                    <div style={{ fontSize: 12, color: C.danger, fontWeight: 600, background: C.dangerBg, borderRadius: 8, padding: '10px 12px' }}>
                      {apiErr}
                    </div>
                  )}

                  {/* 반려 2회 초과 안내 */}
                  {!canReject && (
                    <div style={{ padding: '10px 14px', background: 'oklch(94% 0.04 280)', border: '1px solid oklch(80% 0.08 280)', borderRadius: 10, fontSize: 13, color: 'oklch(50% 0.12 280)', fontWeight: 600 }}>
                      반려 2회 초과 — 이 제출은 승인만 가능합니다.
                    </div>
                  )}

                  {/* 완료 확정 버튼 */}
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={reviewMutation.isPending}
                    onMouseEnter={() => setApproveHov(true)}
                    onMouseLeave={() => setApproveHov(false)}
                    style={{
                      width: '100%', padding: '16px', borderRadius: 10, border: 'none',
                      background: reviewMutation.isPending ? 'oklch(75% 0.1 160)' : approveHov ? 'oklch(55% 0.14 160)' : C.success,
                      color: '#fff', fontSize: 16, fontWeight: 700,
                      cursor: reviewMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 14px oklch(62% 0.15 160 / 30%)',
                      transition: 'background 150ms ease',
                    }}
                  >
                    <IconCheck size={18} />
                    {reviewMutation.isPending ? '처리 중...' : '완료 확정'}
                  </button>

                  {/* 재작업 요청 버튼 — 반려 2회 미만일 때만 표시 */}
                  {canReject && (
                    <button
                      type="button"
                      onClick={() => setRejectOpen((v) => !v)}
                      disabled={reviewMutation.isPending}
                      style={{
                        width: '100%', padding: '15px', borderRadius: 10,
                        border: `2px solid ${rejectOpen ? C.danger : 'oklch(80% 0.08 25)'}`,
                        background: rejectOpen ? C.dangerBg : '#fff',
                        color: C.danger, fontSize: 16, fontWeight: 700,
                        cursor: reviewMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: '150ms ease',
                      }}
                    >
                      <IconX size={18} />
                      재작업 요청
                    </button>
                  )}

                  {/* 반려 사유 입력 영역 */}
                  {canReject && rejectOpen && (
                    <div className="reject-area">
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 8 }}>
                        반려 사유 <span style={{ color: C.danger }}>*</span>
                      </div>
                      <textarea
                        value={rejectNote}
                        onChange={(e) => { setRejectNote(e.target.value); setRejectErr(false); }}
                        onFocus={() => setRejectFocused(true)}
                        onBlur={() => setRejectFocused(false)}
                        placeholder="재작업이 필요한 이유를 입력해주세요. 직원에게 전달됩니다."
                        rows={4}
                        style={{
                          width: '100%', padding: '12px', borderRadius: 8, resize: 'vertical',
                          border: `1.5px solid ${rejectErr ? C.danger : rejectFocused ? C.danger : C.border}`,
                          background: C.pageBg, fontSize: 13, color: C.textPri,
                          lineHeight: 1.6, outline: 'none',
                          fontFamily: 'inherit', transition: '150ms ease',
                          boxShadow: rejectFocused ? '0 0 0 3px oklch(62% 0.16 25 / 15%)' : 'none',
                        }}
                      />

                      {/* 에러 메시지 */}
                      {rejectErr && (
                        <div style={{ fontSize: 12, color: C.danger, fontWeight: 600, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IconCircleX size={12} />
                          반려 사유를 입력해주세요
                        </div>
                      )}

                      {/* 반려 처리 확정 버튼 */}
                      <button
                        type="button"
                        onClick={handleReject}
                        style={{
                          width: '100%', marginTop: 10, padding: '13px', borderRadius: 8,
                          border: 'none', background: C.danger, color: '#fff',
                          fontSize: 14, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'inherit',
                          boxShadow: '0 4px 14px oklch(62% 0.16 25 / 25%)',
                          transition: '150ms ease',
                        }}
                      >
                        반려 처리 확정
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* 처리 완료 후 목록 복귀 */}
              {result && (
                <button
                  type="button"
                  onClick={() => router.push('/admin/reports')}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 8,
                    border: `1.5px solid ${C.border}`, background: '#fff',
                    color: C.textSec, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ← 목록으로 돌아가기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 라이트박스 ── */}
      {lightbox && (
        <div
          role="dialog"
          aria-label="사진 크게 보기"
          onClick={() => setLightbox(false)}
          onKeyDown={(e) => e.key === 'Escape' && setLightbox(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'oklch(5% 0 0 / 88%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
          }}
        >
          {/* 확대 사진 */}
          <div style={{
            width: 480, height: 360, borderRadius: 16,
            background: PHOTO_COLORS[photoIdx % PHOTO_COLORS.length],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, overflow: 'hidden', position: 'relative',
          }}>
            {photos[photoIdx]?.url
              ? <img src={photos[photoIdx].url!} alt={`사진 ${photoIdx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
            }
          </div>

          {/* 레이블 */}
          <span style={{ color: 'oklch(70% 0 0)', fontSize: 13 }}>
            {`사진 ${photoIdx + 1}`} · 탭하면 닫힙니다
          </span>

          {/* 페이지 dots */}
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {(photos as Array<{ id: string; storagePath: string; fileName: string }>).map((_, i) => (
                <span
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                  style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.35)',
                    cursor: 'pointer', transition: '150ms ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
