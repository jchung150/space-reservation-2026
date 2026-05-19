'use client';

import { use, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { Task } from '@/types';
import { PRIORITY_CONFIG } from '@/constants/task-config';
import { useReportStore } from '@/store/report-store';
import DetailHeader from '@/components/employee/DetailHeader';

/* ── 상수 ────────────────────────────────────────────────────────── */
const MAX_PHOTOS = 5;
const MAX_MEMO   = 500;
const MIN_MEMO   = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
// iOS Safari는 HEIC를 'image/heic' 대신 빈 문자열로 반환하는 경우가 있어 startsWith로 검사
const isValidImage = (file: File) =>
  file.type.startsWith('image/') ||
  ['jpg','jpeg','png','heic','heif','webp'].includes(file.name.split('.').pop()?.toLowerCase() ?? '');

/* ── 사진 아이템 타입 ─────────────────────────────────────────────── */
interface PhotoItem {
  id: string;
  url: string;       // objectURL
  name: string;
  progress: number;  // 0–100
  file?: File;       // 원본 파일 (confirm 단계에서 업로드용)
}

/* ── 섹션 타이틀 ─────────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'oklch(18% 0.01 260)' }}>
        {children}
      </span>
    </div>
  );
}

/* ── 카메라 아이콘 ───────────────────────────────────────────────── */
function IconCamera({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────────── */
export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router  = useRouter();

  const { data: task } = useQuery<Task>({
    queryKey: ['task', id],
    queryFn: () => fetch(`/api/tasks/${id}`).then(r => r.json()),
    staleTime: 30_000,
  });

  const p = task ? PRIORITY_CONFIG[task.priority] : null;

  /* ── 상태 ── */
  const [photos,         setPhotos]         = useState<PhotoItem[]>([]);
  const [memo,           setMemo]           = useState('');
  const [memoFocused,    setMemoFocused]    = useState(false);
  const [isComposing,    setIsComposing]    = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [photoError,     setPhotoError]     = useState('');

  /* ── Refs ── */
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

  /* ── 업로드 진행률 시뮬레이션 ── */
  useEffect(() => {
    const uploading = photos.filter((ph) => ph.progress < 100);
    if (uploading.length === 0) return;

    const timer = setInterval(() => {
      setPhotos((prev) =>
        prev.map((ph) =>
          ph.progress < 100 ? { ...ph, progress: Math.min(100, ph.progress + 25) } : ph,
        ),
      );
    }, 150); // 25 × 4 steps ≈ 600ms 완료

    return () => clearInterval(timer);
  }, [photos]);

  /* ── draft에서 상태 복원 (수정하기로 돌아왔을 때) ── */
  useEffect(() => {
    const draft = useReportStore.getState().draft;
    if (!draft || draft.taskId !== id) return;
    setMemo(draft.memo);
    if (draft.photoUrls.length > 0) {
      setPhotos(draft.photoUrls.map((url, i) => ({
        id: `restored-${i}`,
        url,
        name: `사진 ${i + 1}`,
        progress: 100,
      })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ── 파일 선택 핸들러 ── */
  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      setPhotoError('');
      setShowPhotoSheet(false);

      for (const file of Array.from(files)) {
        if (photos.length + 1 > MAX_PHOTOS) {
          setPhotoError(`사진은 최대 ${MAX_PHOTOS}장까지 첨부할 수 있습니다.`);
          break;
        }

        if (!isValidImage(file)) {
          setPhotoError('JPG, PNG, HEIC 형식의 파일만 업로드할 수 있습니다.');
          continue;
        }

        if (file.size > MAX_FILE_BYTES) {
          setPhotoError('파일 크기는 10MB를 초과할 수 없습니다.');
          continue;
        }

        const url = URL.createObjectURL(file);
        setPhotos((prev) => [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, url, name: file.name, progress: 0, file },
        ]);
      }

      // input 초기화 (같은 파일 재선택 허용)
      if (galleryRef.current) galleryRef.current.value = '';
      if (cameraRef.current)  cameraRef.current.value  = '';
    },
    [photos.length],
  );

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const target = prev.find((ph) => ph.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((ph) => ph.id !== id);
    });
    setPhotoError('');
  }, []);

  /* ── 유효성 ── */
  const allLoaded  = photos.every((ph) => ph.progress >= 100);
  const btnEnabled = allLoaded; // 사진·메모 필수 조건 없음
  const btnLabel   = !allLoaded ? '사진 업로드 중...' : '다음 (미리보기)';

  /* ── 제출 ── */
  function handleSubmit() {
    if (!btnEnabled) return;
    useReportStore.getState().setDraft({
      taskId: id,
      photoUrls:  photos.map((ph) => ph.url),
      photoFiles: photos.map((ph) => ph.file).filter((f): f is File => !!f),
      photoCount: photos.length,
      memo,
    });
    router.push(`/tasks/${id}/report/confirm`);
  }

  /* ── 렌더 ── */
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'oklch(95% 0.005 220)',
        position: 'relative',
      }}
    >
      {/* 헤더 */}
      <DetailHeader title="검토 요청" />

      {/* 업무 요약 바 */}
      {task && p && (
        <div
          style={{
            padding: '10px 16px',
            background: '#fff',
            borderBottom: '1px solid oklch(88% 0.008 240)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
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
              flexShrink: 0,
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
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'oklch(18% 0.01 260)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.title}
          </span>
        </div>
      )}

      {/* ── 스크롤 영역 ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

        {/* 사진 첨부 카드 */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid oklch(88% 0.008 240)',
            padding: 16,
            marginBottom: 12,
          }}
        >
          {/* 카드 헤더 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <SectionTitle>사진 첨부</SectionTitle>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: photos.length >= MAX_PHOTOS
                  ? 'oklch(62% 0.16 25)'
                  : 'oklch(50% 0.01 260)',
              }}
            >
              {photos.length} / {MAX_PHOTOS}
            </span>
          </div>

          {/* 사진 그리드 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>

            {/* 썸네일 */}
            {photos.map((ph) => (
              <div key={ph.id} style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
                {/* 이미지 */}
                <img
                  src={ph.url}
                  alt={ph.name}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 8,
                    objectFit: 'cover',
                    display: 'block',
                    border: '1px solid oklch(88% 0.008 240)',
                  }}
                />

                {/* 업로드 진행률 오버레이 */}
                {ph.progress < 100 && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 8,
                      background: 'oklch(0% 0 0 / 45%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {/* 진행 바 */}
                    <div
                      style={{
                        width: 52,
                        height: 4,
                        borderRadius: 2,
                        background: 'oklch(100% 0 0 / 30%)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${ph.progress}%`,
                          background: '#fff',
                          borderRadius: 2,
                          transition: '150ms ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>
                      {ph.progress}%
                    </span>
                  </div>
                )}

                {/* 삭제 버튼 */}
                <button
                  type="button"
                  onClick={() => removePhoto(ph.id)}
                  aria-label={`${ph.name} 삭제`}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'oklch(62% 0.16 25)',
                    border: '2px solid #fff',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: 0,
                    fontFamily: 'inherit',
                  }}
                >
                  ×
                </button>
              </div>
            ))}

            {/* 추가 버튼 */}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => setShowPhotoSheet(true)}
                style={{
                  width: photos.length === 0 ? '100%' : 76,
                  height: photos.length === 0 ? 100 : 76,
                  borderRadius: 8,
                  border: '2px dashed oklch(88% 0.008 240)',
                  background: 'oklch(95% 0.005 220)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  color: 'oklch(50% 0.01 260)',
                  transition: '150ms ease',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                <IconCamera size={24} />
                {photos.length === 0 && (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>+ 사진 추가</span>
                )}
              </button>
            )}
          </div>

          {/* 사진 오류 메시지 */}
          {photoError && (
            <p style={{ fontSize: 12, color: 'oklch(62% 0.16 25)', marginTop: 8 }}>
              {photoError}
            </p>
          )}
        </div>

        {/* 메모 카드 */}
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

          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value.slice(0, MAX_MEMO))}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={(e) => {
              setIsComposing(false);
              setMemo((e.target as HTMLTextAreaElement).value.slice(0, MAX_MEMO));
            }}
            onFocus={() => setMemoFocused(true)}
            onBlur={() => setMemoFocused(false)}
            placeholder="업무 완료 내용을 입력해주세요 (선택)"
            aria-label="메모"
            style={{
              width: '100%',
              height: 130,
              border: `1.5px solid ${memoFocused ? 'oklch(55% 0.14 195)' : 'oklch(88% 0.008 240)'}`,
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              color: 'oklch(18% 0.01 260)',
              fontFamily: "'Noto Sans KR', sans-serif",
              lineHeight: 1.65,
              resize: 'none',
              outline: 'none',
              background: memoFocused ? '#fff' : 'oklch(95% 0.005 220)',
              transition: 'border-color 150ms ease, background 150ms ease',
              boxShadow: memoFocused
                ? '0 0 0 3px oklch(55% 0.14 195 / 20%)'
                : 'none',
            }}
          />

          {/* 메모 하단: 오류 + 글자 수 */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 6,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: 'oklch(62% 0.16 25)',
                minHeight: 16,
              }}
            >
              {''}
            </span>
            <span
              style={{
                fontSize: 12,
                color: memo.length >= MAX_MEMO
                  ? 'oklch(62% 0.16 25)'
                  : 'oklch(50% 0.01 260)',
              }}
            >
              {memo.length} / {MAX_MEMO}
            </span>
          </div>
        </div>

        {/* 스크롤 여백 (하단 버튼 높이만큼) */}
        <div style={{ height: 88 }} />
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
          disabled={!btnEnabled}
          onClick={handleSubmit}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 10,
            border: 'none',
            fontSize: 16,
            fontWeight: 700,
            minHeight: 48,
            cursor: btnEnabled ? 'pointer' : 'not-allowed',
            background: btnEnabled ? 'oklch(55% 0.14 195)' : 'oklch(88% 0.008 240)',
            color: btnEnabled ? '#fff' : 'oklch(50% 0.01 260)',
            transition: 'background 150ms ease, color 150ms ease',
            fontFamily: 'inherit',
          }}
        >
          {btnLabel}
        </button>
      </div>

      {/* ── 사진 선택 바텀시트 ── */}
      {showPhotoSheet && (
        <div
          onClick={() => setShowPhotoSheet(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'oklch(0% 0 0 / 40%)',
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              padding: '16px 16px 36px',
            }}
          >
            {/* 핸들 바 */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'oklch(88% 0.008 240)',
                margin: '0 auto 16px',
              }}
            />

            {/* 시트 제목 */}
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: 'oklch(18% 0.01 260)',
                marginBottom: 14,
                textAlign: 'center',
              }}
            >
              사진 추가
            </div>

            {/* 카메라 */}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'oklch(95% 0.005 220)',
                border: '1px solid oklch(88% 0.008 240)',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 8,
                textAlign: 'left',
                fontFamily: 'inherit',
                minHeight: 48,
              }}
            >
              <span style={{ fontSize: 22 }}>📷</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'oklch(18% 0.01 260)' }}>
                  카메라로 촬영
                </div>
                <div style={{ fontSize: 12, color: 'oklch(50% 0.01 260)', marginTop: 2 }}>
                  지금 바로 촬영합니다
                </div>
              </div>
            </button>

            {/* 갤러리 */}
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'oklch(95% 0.005 220)',
                border: '1px solid oklch(88% 0.008 240)',
                borderRadius: 10,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                marginBottom: 8,
                textAlign: 'left',
                fontFamily: 'inherit',
                minHeight: 48,
              }}
            >
              <span style={{ fontSize: 22 }}>🖼️</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'oklch(18% 0.01 260)' }}>
                  갤러리에서 선택
                </div>
                <div style={{ fontSize: 12, color: 'oklch(50% 0.01 260)', marginTop: 2 }}>
                  저장된 사진을 선택합니다
                </div>
              </div>
            </button>

            {/* 취소 */}
            <button
              type="button"
              onClick={() => setShowPhotoSheet(false)}
              style={{
                width: '100%',
                padding: '13px',
                border: 'none',
                background: 'none',
                fontSize: 15,
                fontWeight: 600,
                color: 'oklch(50% 0.01 260)',
                cursor: 'pointer',
                marginTop: 4,
                fontFamily: 'inherit',
                minHeight: 48,
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 숨겨진 파일 인풋 — 갤러리 */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        style={{ position: 'fixed', top: -100, left: -100, opacity: 0, width: 1, height: 1 }}
        aria-hidden="true"
      />

      {/* 숨겨진 파일 인풋 — 카메라 */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        style={{ position: 'fixed', top: -100, left: -100, opacity: 0, width: 1, height: 1 }}
        aria-hidden="true"
      />
    </div>
  );
}
