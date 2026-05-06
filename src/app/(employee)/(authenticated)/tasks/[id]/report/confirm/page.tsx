'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useReportStore } from '@/store/report-store';
import { PRIORITY_CONFIG } from '@/constants/task-config';
import { getFullDateTimeLabel } from '@/lib/date';
import DetailHeader from '@/components/employee/DetailHeader';
import type { Task } from '@/types';

/* ── SCR-E06 에서 쓰는 SectionTitle (secondary 색상) ──────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: 'oklch(50% 0.01 260)',
        marginBottom: 10,
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </div>
  );
}

/* ── 제출 완료 화면 ─────────────────────────────────────────────── */
function SuccessScreen({ taskName, photoCount }: { taskName: string; photoCount: number }) {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const clearDraft  = useReportStore((s) => s.clearDraft);

  function goHome() {
    clearDraft();
    // 업무 목록 캐시 무효화 → 돌아갔을 때 최신 상태(pending_review) 표시
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    router.push('/tasks');
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#fff',
        padding: '0 32px',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      {/* 체크 아이콘 원 */}
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: '50%',
          background: 'oklch(92% 0.06 160)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          animation: 'circlePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="oklch(62% 0.15 160)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 60,
            strokeDashoffset: 0,
            animation: 'checkDraw 0.4s 0.3s ease both',
          }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* 제목 */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'oklch(18% 0.01 260)',
          marginBottom: 10,
          textAlign: 'center',
          animation: 'fadeUp 0.4s 0.5s ease both',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      >
        업무 검토가 요청되었습니다.
      </div>

      {/* 부제목 */}
      <div
        style={{
          fontSize: 14,
          color: 'oklch(50% 0.01 260)',
          textAlign: 'center',
          lineHeight: 1.7,
          marginBottom: 40,
          animation: 'fadeUp 0.4s 0.65s ease both',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      >
        관리자가 검토 후 승인 처리할 예정입니다.
        <br />
        결과는 업무 상세에서 확인할 수 있어요.
      </div>

      {/* 제출 요약 박스 */}
      <div
        style={{
          width: '100%',
          background: 'oklch(95% 0.005 220)',
          borderRadius: 12,
          border: '1px solid oklch(88% 0.008 240)',
          padding: '14px 16px',
          marginBottom: 32,
          animation: 'fadeUp 0.4s 0.75s ease both',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      >
        <div style={{ fontSize: 13, color: 'oklch(50% 0.01 260)', marginBottom: 4 }}>
          검토 요청한 업무
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'oklch(18% 0.01 260)' }}>
          {taskName}
        </div>
        <div style={{ fontSize: 12, color: 'oklch(50% 0.01 260)', marginTop: 6 }}>
          사진 {photoCount}장 · 메모 포함
        </div>
      </div>

      {/* 홈으로 버튼 */}
      <button
        type="button"
        onClick={goHome}
        style={{
          width: '100%',
          padding: '15px',
          borderRadius: 10,
          border: 'none',
          background: 'oklch(55% 0.14 195)',
          color: '#fff',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          minHeight: 48,
          animation: 'fadeUp 0.4s 0.85s ease both',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      >
        업무 목록으로 돌아가기
      </button>
    </div>
  );
}

/* ── 확인 화면 ──────────────────────────────────────────────────── */
function ConfirmScreen({
  taskName,
  taskDeadline,
  priority,
  photoUrls,
  memo,
  onEdit,
  onSubmit,
  submitting = false,
  submitError = '',
}: {
  taskName: string;
  taskDeadline: string;
  priority: 'high' | 'medium' | 'low';
  photoUrls: string[];
  memo: string;
  onEdit: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitError?: string;
}) {
  const p = PRIORITY_CONFIG[priority];
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'oklch(95% 0.005 220)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <DetailHeader title="검토 요청 전 확인" />

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* 업무 정보 카드 */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid oklch(88% 0.008 240)',
            padding: 16,
            marginBottom: 12,
          }}
        >
          {/* 우선순위 배지 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: p.color,
                background: p.bgColor,
                borderRadius: 6,
                padding: '2px 8px',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: p.dotColor,
                  display: 'inline-block',
                }}
              />
              {p.label}
            </span>
          </div>

          {/* 업무명 */}
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: 'oklch(18% 0.01 260)',
              marginBottom: 10,
            }}
          >
            {taskName}
          </div>

          {/* 마감 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: 'oklch(50% 0.01 260)',
              fontSize: 13,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            마감 {getFullDateTimeLabel(taskDeadline)}
          </div>
        </div>

        {/* 첨부 사진 카드 */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid oklch(88% 0.008 240)',
            padding: 16,
            marginBottom: 12,
          }}
        >
          <SectionTitle>사진 첨부 ({photoUrls.length}장)</SectionTitle>
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {photoUrls.map((url, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`사진 ${i + 1} 크게 보기`}
                onClick={() => setLightboxIdx(i)}
                onKeyDown={(e) => e.key === 'Enter' && setLightboxIdx(i)}
                style={{
                  position: 'relative',
                  width: 90,
                  height: 90,
                  borderRadius: 8,
                  flexShrink: 0,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: '150ms ease',
                  outline: 'none',
                }}
              >
                <img
                  src={url}
                  alt={`첨부 사진 ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* 확대 아이콘 오버레이 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'oklch(0% 0 0 / 20%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ opacity: 0.85 }}>
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 완료 메모 카드 */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid oklch(88% 0.008 240)',
            padding: 16,
            marginBottom: 12,
          }}
        >
          <SectionTitle>메모</SectionTitle>
          <p style={{ fontSize: 14, color: 'oklch(18% 0.01 260)', lineHeight: 1.7 }}>
            {memo}
          </p>
        </div>

        {/* 제출 안내 박스 */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            background: 'oklch(96% 0.05 85)',
            border: '1px solid oklch(88% 0.08 85)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 12,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="oklch(60% 0.16 65)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: 1 }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={{ fontSize: 13, color: 'oklch(40% 0.08 65)', lineHeight: 1.6 }}>
            제출 후에는 수정이 불가능합니다.
            <br />
            내용을 다시 한번 확인해주세요.
          </span>
        </div>

        <div style={{ height: 96 }} />
      </div>

      {/* 하단 버튼 */}
      <div
        style={{
          padding: '12px 16px',
          background: '#fff',
          borderTop: '1px solid oklch(88% 0.008 240)',
          display: 'flex',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onEdit}
          style={{
            flex: 1,
            padding: '14px',
            borderRadius: 10,
            border: '1.5px solid oklch(88% 0.008 240)',
            background: '#fff',
            fontSize: 15,
            fontWeight: 600,
            color: 'oklch(50% 0.01 260)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            minHeight: 48,
          }}
        >
          수정하기
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          style={{
            flex: 2,
            padding: '14px',
            borderRadius: 10,
            border: 'none',
            background: submitting ? 'oklch(75% 0.08 195)' : 'oklch(55% 0.14 195)',
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            minHeight: 48,
            transition: '150ms ease',
          }}
        >
          {submitting ? '요청 중...' : '최종 검토 요청'}
        </button>
      </div>

      {/* 제출 오류 */}
      {submitError && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'oklch(62% 0.16 25)', color: '#fff',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          zIndex: 200, whiteSpace: 'nowrap', boxShadow: '0 4px 16px oklch(0% 0 0 / 25%)',
        }}>
          {submitError}
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxIdx !== null && (
        <div
          role="dialog"
          aria-label="사진 크게 보기"
          onClick={() => setLightboxIdx(null)}
          onKeyDown={(e) => e.key === 'Escape' && setLightboxIdx(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'oklch(5% 0 0 / 92%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <img
            src={photoUrls[lightboxIdx]}
            alt={`사진 ${lightboxIdx + 1}`}
            style={{
              maxWidth: '88vw',
              maxHeight: '72vh',
              borderRadius: 12,
              objectFit: 'contain',
            }}
          />
          {/* 페이지 표시 */}
          <div style={{ display: 'flex', gap: 6 }}>
            {photoUrls.map((_, i) => (
              <span
                key={i}
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i === lightboxIdx ? '#fff' : 'oklch(70% 0 0 / 50%)',
                  cursor: 'pointer',
                  transition: '150ms ease',
                }}
              />
            ))}
          </div>
          <span style={{ color: 'oklch(65% 0 0)', fontSize: 13 }}>탭하면 닫힙니다</span>
        </div>
      )}
    </div>
  );
}

/* ── 페이지 진입점 ──────────────────────────────────────────────── */
export default function ReportConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();
  const draft   = useReportStore((s) => s.draft);

  // ── 모든 useState/useQuery는 early return 이전에 선언 (Rules of Hooks) ──
  const [submitted,   setSubmitted]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');

  /* 실 API에서 업무 조회 */
  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ['task', id],
    queryFn: () => fetch(`/api/tasks/${id}`).then(r => r.json()),
    staleTime: 30_000,
  });

  /* draft 없이 직접 진입하면 보고 입력으로 돌아감
     단, 제출 완료(submitted) 상태에서는 draft가 지워져도 리다이렉트하지 않음 */
  useEffect(() => {
    if (!draft && !submitted) router.replace(`/tasks/${id}/report`);
  }, [draft, submitted, id, router]);

  // ── early return (hooks 이후에 위치) ──
  if (!draft || isLoading) return null;
  if (!task)  return null;

  if (submitted) {
    return (
      <SuccessScreen taskName={task.title} photoCount={draft.photoCount} />
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      /* ── 1. 보고 생성 ── */
      const res = await fetch(`/api/tasks/${id}/report`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ memo: draft?.memo ?? '' }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSubmitError(d.error ?? '제출에 실패했습니다.');
        return;
      }
      const { reportId } = await res.json();

      /* ── 2. 사진 업로드 (objectURL → blob → FormData) ── */
      const photoUrls = draft?.photoUrls ?? [];
      if (reportId && photoUrls.length > 0) {
        const formData = new FormData();
        for (let i = 0; i < photoUrls.length; i++) {
          try {
            const blob = await fetch(photoUrls[i]).then(r => r.blob());
            formData.append('photos', blob, `photo-${i}`);
          } catch {
            // objectURL이 이미 해제된 경우 건너뜀
          }
        }
        if (formData.has('photos')) {
          await fetch(`/api/reports/${reportId}/photos`, {
            method: 'POST',
            body:   formData,
          });
        }
      }

      setSubmitted(true);
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <ConfirmScreen
        taskName={task.title}
        taskDeadline={task.deadline}
        priority={task.priority}
        photoUrls={draft.photoUrls}
        memo={draft.memo}
        onEdit={() => router.back()}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitError={submitError}
      />
    </>
  );
}
