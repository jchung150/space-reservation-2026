'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import ImageLightbox from '@/components/ImageLightbox';
import type { Task, TaskStatus } from '@/types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/constants/task-config';
import { getFullDateTimeLabel, getDateOnlyLabel } from '@/lib/date';
import DetailHeader from '@/components/employee/DetailHeader';

/* ── 섹션 타이틀 ─────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'oklch(50% 0.01 260)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

/* ── 정보 행 ─────────────────────────────────────────────────── */
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '8px 0',
      }}
    >
      <span style={{ color: 'oklch(50% 0.01 260)', flexShrink: 0, marginTop: 1 }}>
        {icon}
      </span>
      <span
        style={{
          fontSize: 13,
          color: 'oklch(50% 0.01 260)',
          flexShrink: 0,
          width: 52,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          color: 'oklch(18% 0.01 260)',
          fontWeight: 600,
          flex: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ── 구분선 ──────────────────────────────────────────────────── */
function Divider() {
  return <div style={{ height: 1, background: 'oklch(88% 0.008 240)' }} />;
}

/* ── 흰 카드 ─────────────────────────────────────────────────── */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid oklch(88% 0.008 240)',
        boxShadow: '0 1px 4px oklch(0% 0 0 / 6%)',
        padding: 16,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

/* ── 참고 이미지 플레이스홀더 ────────────────────────────────── */
function ImgPlaceholder() {
  return (
    <div
      style={{
        width: 96,
        height: 72,
        borderRadius: 8,
        background: 'oklch(95% 0.005 220)',
        border: '1px solid oklch(88% 0.008 240)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flexShrink: 0,
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="oklch(50% 0.01 260)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
      <span style={{ fontSize: 9, color: 'oklch(50% 0.01 260)', fontFamily: 'monospace' }}>
        참고 이미지
      </span>
    </div>
  );
}

/* ── 하단 버튼 설정 ──────────────────────────────────────────── */
function getBottomButton(status: TaskStatus): {
  label: string;
  disabled: boolean;
} {
  if (status === 'done') return { label: '이미 완료된 업무입니다', disabled: true };
  if (status === 'pending_review') return { label: '검토 중입니다', disabled: true };
  if (status === 'rework') return { label: '재작업 검토 요청하기', disabled: false };
  return { label: '검토 요청하기', disabled: false };
}

/* ── SVG 아이콘 ─────────────────────────────────────────────── */
const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconMapPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

/* ── 메인 페이지 ──────────────────────────────────────────────── */
export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }  = use(params);
  const router  = useRouter();
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const { data: task, isLoading, isError } = useQuery<Task>({
    queryKey: ['task', id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.status === 404) throw Object.assign(new Error('not-found'), { status: 404 });
      if (!res.ok) throw new Error('fetch error');
      return res.json();
    },
    retry: false,
    staleTime: 30_000,
  });

  /* 로딩 */
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'oklch(95% 0.005 220)' }}>
        <DetailHeader title="업무 상세" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'oklch(65% 0.01 260)', fontSize: 14 }}>
          불러오는 중...
        </div>
      </div>
    );
  }

  /* 오류 / 없음 */
  if (isError || !task) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'oklch(95% 0.005 220)' }}>
        <DetailHeader title="업무 상세" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'oklch(62% 0.16 25)', fontSize: 14 }}>
          업무를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  const p   = PRIORITY_CONFIG[task.priority];
  const s   = STATUS_CONFIG[task.status];
  const btn = getBottomButton(task.status);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'oklch(95% 0.005 220)',
      }}
    >
      {/* 헤더 */}
      <DetailHeader title="업무 상세" />

      {/* 스크롤 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* ── 업무 정보 카드 ── */}
        <Card>
          {/* 배지 행 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: p.color,
                background: p.bgColor,
                borderRadius: 6,
                padding: '3px 10px',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: p.dotColor,
                  display: 'inline-block',
                }}
              />
              {p.label}
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: s.color,
                background: s.bgColor,
                borderRadius: 6,
                padding: '3px 10px',
              }}
            >
              {s.label}
            </span>
          </div>

          {/* 업무명 */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'oklch(18% 0.01 260)',
              lineHeight: 1.4,
              marginBottom: 16,
            }}
          >
            {task.title}
          </div>

          <Divider />

          <InfoRow icon={<IconClock />} label="마감일시" value={getFullDateTimeLabel(task.deadline)} />
          <Divider />
          <InfoRow icon={<IconMapPin />} label="건물" value={task.buildingName ?? '—'} />
          <Divider />
          <InfoRow icon={<IconClock />} label="업무 유형" value={task.taskTypeName ?? '—'} />
          <Divider />
          <InfoRow
            icon={<IconUser />}
            label="배정자"
            value={task.assignedByName ?? '—'}
          />
          <Divider />
          <InfoRow icon={<IconCalendar />} label="배정일시" value={getFullDateTimeLabel(task.createdAt)} />
          <Divider />
          <InfoRow
            icon={<IconClock />}
            label="반복"
            value={task.repeatType && task.repeatType !== 'none' ? ({ daily: '매일', weekly: '매주', monthly: '매월', yearly: '매년' }[task.repeatType] ?? '—') : '—'}
          />
          {(task as any).approvedBy && (
            <>
              <Divider />
              <InfoRow
                icon={<IconUser />}
                label="승인자"
                value={(task as any).approvedBy}
              />
            </>
          )}
          {(task as any).approvedAt && (
            <>
              <Divider />
              <InfoRow
                icon={<IconCalendar />}
                label="승인일"
                value={getDateOnlyLabel((task as any).approvedAt)}
              />
            </>
          )}

          {/* 완료 업무 안내 (done 상태일 때) */}
          {task.status === 'done' && (
            <>
              <Divider />
              <div style={{ paddingTop: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="oklch(55% 0.14 195)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style={{ fontSize: 13, color: 'oklch(55% 0.14 195)', lineHeight: 1.5 }}>
                  이 업무는 완료 후 7일간 확인할 수 있어요.
                </span>
              </div>
            </>
          )}

          {/* 재작업 사유 (rework 상태일 때만) */}
          {task.status === 'rework' && task.reworkReason && (
            <>
              <Divider />
              <div style={{ paddingTop: 8 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'oklch(62% 0.16 25)',
                    marginBottom: 6,
                  }}
                >
                  반려 사유
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: 'oklch(62% 0.16 25)',
                    lineHeight: 1.6,
                    background: 'oklch(97% 0.01 25)',
                    borderRadius: 8,
                    padding: '10px 12px',
                  }}
                >
                  {task.reworkReason}
                </p>
              </div>
            </>
          )}
        </Card>

        {/* ── 업무 설명 카드 ── */}
        <Card>
          <SectionTitle>업무 설명</SectionTitle>
          <p
            style={{
              fontSize: 14,
              color: 'oklch(18% 0.01 260)',
              lineHeight: 1.75,
              whiteSpace: 'pre-line',
            }}
          >
            {task.description}
          </p>
        </Card>

        {/* ── 참고 이미지 카드 ── */}
        {(task.referenceImages ?? []).length > 0 && (
          <Card>
            <SectionTitle>참고 이미지</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {(task.referenceImages ?? []).map((url, i) => (
                <button key={i} type="button" onClick={() => setLightbox({ images: task.referenceImages!, index: i })}
                  style={{ width: 90, height: 90, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid oklch(88% 0.008 240)', cursor: 'pointer', padding: 0 }}>
                  <img src={url} alt={`참고 이미지 ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* ── 제출한 사진 카드 (검토 대기·완료 상태일 때) ── */}
        {((task as any).submittedPhotos ?? []).length > 0 && (
          <Card>
            <SectionTitle>제출한 사진</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {((task as any).submittedPhotos as string[]).map((url, i) => (
                <button key={i} type="button" onClick={() => setLightbox({ images: (task as any).submittedPhotos, index: i })}
                  style={{ width: 90, height: 90, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid oklch(88% 0.008 240)', cursor: 'pointer', padding: 0 }}>
                  <img src={url} alt={`제출 사진 ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* 하단 버튼 영역만큼 여백 */}
        <div style={{ height: 80 }} />
      </div>

      {/* ── 하단 고정 버튼 ── */}
      <div
        style={{
          padding: '12px 16px',
          background: '#fff',
          borderTop: '1px solid oklch(88% 0.008 240)',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          disabled={btn.disabled}
          onClick={() => !btn.disabled && router.push(`/tasks/${id}/report`)}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 10,
            border: 'none',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.01em',
            minHeight: 48,
            cursor: btn.disabled ? 'not-allowed' : 'pointer',
            background: btn.disabled ? 'oklch(88% 0.008 240)' : 'oklch(55% 0.14 195)',
            color: btn.disabled ? 'oklch(50% 0.01 260)' : '#fff',
            transition: '150ms ease',
            fontFamily: 'inherit',
          }}
        >
          {btn.label}
        </button>
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNav={i => setLightbox({ ...lightbox, index: i })}
        />
      )}
    </div>
  );
}
