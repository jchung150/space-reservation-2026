'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { Priority, RepeatType } from '@/types';

/* ── 색상 ─────────────────────────────────────────────────────── */
const C = {
  primary:   'oklch(55% 0.14 195)',
  primaryBg: 'oklch(93% 0.06 195)',
  danger:    'oklch(62% 0.16 25)',
  success:   'oklch(62% 0.15 160)',
  successBg: 'oklch(93% 0.05 160)',
  warning:   'oklch(65% 0.16 65)',
  border:    'oklch(88% 0.008 240)',
  pageBg:    'oklch(95% 0.005 220)',
  textPri:   'oklch(18% 0.01 260)',
  textSec:   'oklch(50% 0.01 260)',
  textMuted: 'oklch(65% 0.01 260)',
};

/* ── Staff API 타입 ────────────────────────────────────────────── */
interface StaffOption {
  id:       string;
  name:     string;
  jobTypes: string[];   // 복수 직군
  depts:    string[];   // 표시용 레이블 배열
}


const PRIORITY_OPTIONS = [
  { key: 'high'   as Priority, label: '높음', color: 'oklch(62% 0.16 25)'  },
  { key: 'medium' as Priority, label: '보통', color: 'oklch(65% 0.16 65)'  },
  { key: 'low'    as Priority, label: '낮음', color: 'oklch(62% 0.15 160)' },
] as const;

const DAYS_KR = ['월', '화', '수', '목', '금', '토', '일'] as const;

/* ── 초기값 타입 ────────────────────────────────────────────────── */
export interface TaskFormInitialData {
  taskId:              string;
  title:               string;
  desc:                string;
  priority:            Priority;
  dueDate:             string;
  dueTime:             string;
  assigneeId:          string;
  buildingId?:         string;
  taskTypeId?:         string;
  existingImages?:     { url: string; path: string }[];
}

/* ── 건물 옵션 타입 ────────────────────────────────────────────── */
interface BuildingOption {
  id:        string;
  name:      string;
  sortOrder: number;
  isActive:  boolean;
}

/* ── 업무 유형 옵션 타입 ─────────────────────────────────────── */
interface TaskTypeOption {
  id:        string;
  name:      string;
  jobType:   string;
  sortOrder: number;
  isActive:  boolean;
}

/* ── 유효성 에러 타입 ───────────────────────────────────────────── */
interface FormErrors {
  title?:      string;
  desc?:       string;
  dueDate?:    string;
  assigneeId?: string;
  buildingId?: string;
  taskTypeId?: string;
}

/* ── 공통 소형 컴포넌트 ─────────────────────────────────────────── */

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 4 }}>
      {children}
      {required && <span style={{ color: C.danger, fontSize: 13 }}>*</span>}
    </div>
  );
}

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5, fontSize: 12, color: C.danger, fontWeight: 600 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {msg}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: C.pageBg }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, error, type = 'text',
}: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; error?: string; type?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 8,
        border: `1.5px solid ${error ? C.danger : focused ? C.primary : C.border}`,
        background: focused ? '#fff' : C.pageBg,
        boxShadow: focused && !error ? '0 0 0 3px oklch(55% 0.14 195 / 18%)' : 'none',
        fontSize: 14, color: C.textPri, outline: 'none',
        fontFamily: 'inherit', transition: '150ms ease',
      }}
    />
  );
}

function FocusTextarea({
  value, onChange, placeholder, error, rows = 4,
}: {
  value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; error?: string; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  return (
    <textarea
      value={value}
      rows={rows}
      onChange={onChange}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={(e) => { setIsComposing(false); onChange(e as unknown as React.ChangeEvent<HTMLTextAreaElement>); }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 8, resize: 'vertical',
        border: `1.5px solid ${error ? C.danger : focused ? C.primary : C.border}`,
        background: focused ? '#fff' : C.pageBg,
        boxShadow: focused && !error ? '0 0 0 3px oklch(55% 0.14 195 / 18%)' : 'none',
        fontSize: 14, color: C.textPri, lineHeight: 1.65,
        outline: 'none', fontFamily: 'inherit', transition: '150ms ease',
      }}
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(e) => e.key === ' ' && onChange()}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? C.primary : C.border,
        position: 'relative', cursor: 'pointer',
        transition: '200ms ease', flexShrink: 0, outline: 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: '200ms ease',
        boxShadow: '0 1px 3px oklch(0% 0 0 / 20%)',
      }} />
    </div>
  );
}

/* ── 날짜/시간 인풋 (네이티브) ──────────────────────────────────── */
function DateInput({
  value, onChange, error,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={onChange}
      className="admin-select"
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 8,
        border: `1.5px solid ${error ? C.danger : C.border}`,
        background: C.pageBg, fontSize: 16, color: C.textPri,
        outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
        minHeight: 44,
      }}
    />
  );
}

/* 1시간 단위 시간 선택 드롭다운 — 09:00부터 시작 */
const TIME_OPTIONS: string[] = Array.from({ length: 24 }, (_, i) => {
  const h = (i + 9) % 24;
  return `${String(h).padStart(2, '0')}:00`;
});

function TimeSelect({
  value, onChange, error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        className="admin-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 32px 10px 12px', borderRadius: 8,
          border: `1.5px solid ${error ? C.danger : C.border}`,
          background: C.pageBg, fontSize: 14,
          color: value ? C.textPri : C.textSec,
          outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        <option value="">시간 선택 (기본 14:00)</option>
        {TIME_OPTIONS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <svg
        width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke={C.textSec} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

/* ── 반복 주기 레이블 → RepeatType 변환 ────────────────────────── */
// 반복 주기: 마감일 기준으로 주기만 설정 (요일/날짜는 마감일에서 자동 결정)
const REPEAT_TYPE_MAP: Record<string, RepeatType> = {
  '매일': 'daily', '매주': 'weekly', '매월': 'monthly', '매년': 'yearly',
};

/* ── 메인 폼 컴포넌트 ────────────────────────────────────────────── */
export default function TaskFormPage({
  isEdit = false,
  initialData,
  fromRequestId,
  prefill,
}: {
  isEdit?: boolean;
  initialData?: TaskFormInitialData;
  fromRequestId?: string;
  prefill?: { title?: string; desc?: string; location?: string };
}) {
  const router      = useRouter();
  const queryClient = useQueryClient();

  /* 직원 목록 (API) */
  const [staffList,  setStaffList]  = useState<StaffOption[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);

  /* 건물 목록 (API) */
  const [buildingList, setBuildingList] = useState<BuildingOption[]>([]);

  /* 업무 유형 목록 (API) */
  const [taskTypeList, setTaskTypeList] = useState<TaskTypeOption[]>([]);

  useEffect(() => {
    fetch('/api/admin/staff')
      .then(r => r.json())
      .then((data: StaffOption[]) => setStaffList(data))
      .catch(console.error)
      .finally(() => setStaffLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/admin/buildings?active=true')
      .then(r => r.json())
      .then((data: BuildingOption[]) => setBuildingList(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/admin/task-types?active=true')
      .then(r => r.json())
      .then((data: TaskTypeOption[]) => setTaskTypeList(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  /* 폼 상태 */
  const [title,      setTitle]      = useState(initialData?.title     ?? prefill?.title    ?? '');
  const [desc,       setDesc]       = useState(initialData?.desc      ?? prefill?.desc     ?? '');
  const [priority,   setPriority]   = useState<Priority>(initialData?.priority  ?? 'medium');
  const [dueDate,    setDueDate]    = useState(initialData?.dueDate   ?? '');
  const [dueTime,    setDueTime]    = useState(initialData?.dueTime   ?? '');
  const [assigneeId, setAssigneeId] = useState(initialData?.assigneeId ?? '');
  const [buildingId, setBuildingId] = useState(initialData?.buildingId ?? '');
  const [taskTypeId, setTaskTypeId] = useState(initialData?.taskTypeId ?? '');

  /* 반복 설정 */
  const [repeat,     setRepeat]     = useState(false);
  const [repeatType, setRepeatType] = useState<'매일' | '매주' | '매월' | '매년'>('매주');

  /* 참고 이미지 — 기존(이미 업로드된) + 신규(File 객체) */
  const [existingImages, setExistingImages] = useState<{ url: string; path: string }[]>(
    initialData?.existingImages ?? []
  );
  const [refImages,  setRefImages]  = useState<{ id: string; file: File; preview: string }[]>([]);
  const refInputRef = useRef<HTMLInputElement>(null);

  /* 드래그 */
  const [dragOver,   setDragOver]   = useState(false);

  /* 유효성 / 제출 */
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [saving,      setSaving]      = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [apiError,    setApiError]    = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDirect,    setIsDirect]    = useState(false);

  /* 배정 가능한 전체 직원 (직군 제한 없음) */
  const assignableStaff = staffList;

  const [imageError, setImageError] = useState('');

  /* ── 핸들러 ── */
  function addRefImages(files: FileList | null) {
    if (!files) return;
    setImageError('');
    const VALID = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
    for (const file of Array.from(files)) {
      if (existingImages.length + refImages.length >= 5) break;
      if (!VALID.has(file.type) && !file.name.match(/\.(heic|heif)$/i)) continue;
      if (file.size > 10 * 1024 * 1024) {
        setImageError(`"${file.name}" 파일이 10MB를 초과합니다. 10MB 이하의 이미지만 첨부할 수 있어요.`);
        if (refInputRef.current) refInputRef.current.value = '';
        return;
      }
      const preview = URL.createObjectURL(file);
      setRefImages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, file, preview }]);
    }
    if (refInputRef.current) refInputRef.current.value = '';
  }

  function removeRefImage(id: string) {
    setRefImages(prev => {
      const target = prev.find(i => i.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter(i => i.id !== id);
    });
  }

  function changeTaskType(newId: string) {
    setTaskTypeId(newId);
    if (errors.taskTypeId) setErrors(p => ({ ...p, taskTypeId: undefined }));
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!title.trim())  e.title      = '업무명을 입력해주세요';
    if (!dueDate)       e.dueDate    = '마감일을 선택해주세요';
    if (!taskTypeId)    e.taskTypeId = '업무 유형을 선택해주세요';
    if (!assigneeId)    e.assigneeId = '담당자를 선택해주세요';
    if (!buildingId)    e.buildingId = '건물을 선택해주세요';
    return e;
  }

  function handleClickSave(direct = false) {
    if (imageError) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setIsDirect(direct);
    setShowConfirm(true);
  }

  async function handleSave() {

    setSaving(true);
    setApiError('');

    // 로컬 시간 문자열을 Date 객체로 만들면 브라우저가 로컬 타임존으로 해석
    // .toISOString()으로 UTC 변환 → DB(timestamptz)에 올바르게 저장됨
    const deadline = new Date(`${dueDate}T${dueTime || '14:00'}:00`).toISOString();

    // 참고 이미지: 기존 경로 유지 + 신규 파일 업로드
    let newPaths: string[] = [];
    if (refImages.length > 0) {
      const formData = new FormData();
      for (const img of refImages) formData.append('images', img.file, img.file.name);
      const uploadRes = await fetch('/api/admin/reference-images', { method: 'POST', body: formData });
      if (uploadRes.ok) {
        const { paths } = await uploadRes.json();
        newPaths = paths ?? [];
      }
    }
    const referenceImages = [...existingImages.map(i => i.path), ...newPaths];

    const body = {
      title: title.trim(),
      description: desc.trim(),
      assigneeId,
      buildingId,
      taskTypeId,
      location: '',
      priority,
      deadline,
      repeatType: repeat && !isDirect ? REPEAT_TYPE_MAP[repeatType] : 'none' as RepeatType,
      referenceImages,
      ...(isDirect && { archiveDirect: true }),
    };

    try {
      const url    = isEdit ? `/api/admin/tasks/${initialData!.taskId}` : '/api/admin/tasks';
      const method = isEdit ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error ?? '저장에 실패했습니다.');
        return;
      }
      const resData = await res.json();
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['archive'] });

      // 요청에서 전환된 경우 요청 상태를 'converted'로 업데이트
      if (fromRequestId) {
        await fetch(`/api/admin/task-requests/${fromRequestId}/convert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: resData?.id }),
        }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['task-requests'] });
      }

      setTimeout(() => router.push(isDirect ? '/admin/tasks/archive' : '/admin/tasks'), 1200);
    } catch {
      setApiError('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  /* ── 렌더 ── */
  return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>

      {/* 페이지 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => router.push('/admin/tasks')}
          aria-label="업무 목록으로 돌아가기"
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: `1px solid ${C.border}`, background: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.textSec, flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri }}>
            {isEdit ? '업무 수정' : '새 업무 생성'}
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
            {isEdit ? '업무 내용을 수정하세요' : '새로운 업무를 생성하고 직원에게 배정하세요'}
          </p>
        </div>
      </div>

      {/* 최대 너비 콘텐츠 */}
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* API 오류 배너 */}
        {apiError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'oklch(95% 0.04 25)', border: '1px solid oklch(78% 0.1 25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.danger }}>{apiError}</span>
          </div>
        )}


        {/* ── 기본 정보 ── */}
        <SectionCard title="기본 정보">

          {/* 업무명 */}
          <div style={{ marginBottom: 16 }}>
            <Label required>업무명</Label>
            <TextInput
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((prev) => ({ ...prev, title: undefined })); }}
              placeholder="업무명을 입력하세요"
              error={errors.title}
            />
            <ErrorMsg msg={errors.title} />
          </div>

          {/* 업무 설명 */}
          <div style={{ marginBottom: 16 }}>
            <Label>업무 설명</Label>
            <FocusTextarea
              value={desc}
              onChange={(e) => { setDesc(e.target.value); if (errors.desc) setErrors((prev) => ({ ...prev, desc: undefined })); }}
              placeholder="직원에게 전달할 업무 지시사항을 입력하세요"
              error={errors.desc}
              rows={4}
            />
            <ErrorMsg msg={errors.desc} />
          </div>

          {/* 건물 */}
          <div style={{ marginBottom: 16 }}>
            <Label required>건물</Label>
            {buildingList.length === 0 ? (
              <div style={{ fontSize: 13, color: C.textMuted }}>
                등록된 건물이 없습니다. 먼저 <a href="/admin/master/buildings" style={{ color: C.primary, fontWeight: 600 }}>기준 정보 관리</a>에서 추가하세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {buildingList.map(b => {
                  const checked = buildingId === b.id;
                  return (
                    <button key={b.id} type="button"
                      onClick={() => { setBuildingId(b.id); if (errors.buildingId) setErrors(p => ({ ...p, buildingId: undefined })); }}
                      style={{
                        padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${checked ? C.primary : errors.buildingId ? C.danger : C.border}`,
                        background: checked ? C.primaryBg : C.pageBg,
                        fontSize: 13, fontWeight: 600, color: checked ? C.primary : C.textPri,
                        transition: '150ms ease', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                      {b.name}
                      {checked && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <ErrorMsg msg={errors.buildingId} />
          </div>

          {/* 업무 유형 */}
          <div style={{ marginBottom: 16 }}>
            <Label required>업무 유형</Label>
            {taskTypeList.length === 0 ? (
              <div style={{ fontSize: 13, color: C.textMuted }}>
                등록된 유형이 없습니다. 먼저 <a href="/admin/master/task-types" style={{ color: C.primary, fontWeight: 600 }}>기준 정보 관리</a>에서 추가하세요.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {taskTypeList.map(t => {
                  const checked = taskTypeId === t.id;
                  return (
                    <button key={t.id} type="button"
                      onClick={() => changeTaskType(t.id)}
                      style={{
                        padding: '9px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${checked ? C.primary : errors.taskTypeId ? C.danger : C.border}`,
                        background: checked ? C.primaryBg : C.pageBg,
                        fontSize: 13, fontWeight: 600, color: checked ? C.primary : C.textPri,
                        transition: '150ms ease', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                      {t.name}
                      {checked && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <ErrorMsg msg={errors.taskTypeId} />
          </div>

          {/* 우선순위 */}
          <div style={{ marginBottom: 16 }}>
            <Label required>우선순위</Label>
            <div style={{
              display: 'flex', gap: 0,
              background: C.pageBg, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: 3, width: 'fit-content',
            }}>
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPriority(opt.key)}
                  style={{
                    padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                    background: priority === opt.key ? opt.color : 'transparent',
                    color: priority === opt.key ? '#fff' : C.textSec,
                    transition: '150ms ease',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 마감일시 */}
          <div>
            <Label required>마감일시</Label>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <DateInput
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); if (errors.dueDate) setErrors((p) => ({ ...p, dueDate: undefined })); }}
                  error={errors.dueDate}
                />
                <ErrorMsg msg={errors.dueDate} />
              </div>
              <div style={{ width: 140 }}>
                <TimeSelect
                  value={dueTime}
                  onChange={(v) => setDueTime(v)}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 담당자 배정 ── */}
        <SectionCard title="담당자 배정">

          <div>
            <Label required>담당자</Label>
            {staffLoading ? (
              <div style={{ fontSize: 13, color: C.textMuted }}>직원 목록 불러오는 중...</div>
            ) : assignableStaff.length === 0 ? (
              <div style={{ fontSize: 13, color: C.textMuted }}>활성 직원이 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {assignableStaff.map(staff => {
                  const checked = assigneeId === staff.id;
                  return (
                    <button key={staff.id} type="button"
                      onClick={() => { setAssigneeId(staff.id); if (errors.assigneeId) setErrors(p => ({ ...p, assigneeId: undefined })); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${checked ? C.primary : C.border}`, background: checked ? C.primaryBg : C.pageBg, transition: '150ms ease', userSelect: 'none', fontFamily: 'inherit' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: checked ? C.primary : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {staff.name[0]}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: checked ? C.primary : C.textPri }}>{staff.name}</span>
                      {checked && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <ErrorMsg msg={errors.assigneeId} />
          </div>
        </SectionCard>

        {/* ── 반복 설정 ── */}
        <SectionCard title="반복 설정">
          {/* 헤더 행 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: repeat ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.textPri }}>반복 업무로 설정</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>설정 시 자동으로 반복 생성됩니다</div>
            </div>
            <Toggle checked={repeat} onChange={() => setRepeat((v) => !v)} />
          </div>

          {/* 반복 주기 선택 — 마감일 기준으로 자동 적용 */}
          {repeat && (
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <Label>반복 주기</Label>
              <div style={{ display: 'flex', gap: 0, background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, width: 'fit-content' }}>
                {(['매일', '매주', '매월', '매년'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setRepeatType(t)}
                    style={{ padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: repeatType === t ? C.primary : 'transparent', color: repeatType === t ? '#fff' : C.textSec, transition: '150ms ease' }}>
                    {t}
                  </button>
                ))}
              </div>
              {/* 반복 설명 + 사전 생성 안내 */}
              <div style={{ marginTop: 10, background: C.primaryBg, borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>
                  {{
                    '매일': '마감 시간에 매일 반복됩니다.',
                    '매주': `마감일의 요일(${dueDate ? (['일','월','화','수','목','금','토'][new Date(dueDate).getDay()] + '요일') : '—'})마다 반복됩니다.`,
                    '매월': `매월 ${dueDate ? new Date(dueDate).getDate() + '일' : '—'}에 반복됩니다.`,
                    '매년': `매년 ${dueDate ? `${new Date(dueDate).getMonth() + 1}월 ${new Date(dueDate).getDate()}일` : '—'}에 반복됩니다.`,
                  }[repeatType]}
                </div>
                <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.6 }}>
                  {repeatType === '매년'
                    ? '생성 시 2개의 업무(올해·내년)가 미리 만들어지며,'
                    : '생성 시 3개의 업무가 미리 만들어지며,'
                  }
                  {' '}완료 확정될 때마다 다음 업무가 자동으로 추가됩니다.
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── 참고 이미지 (선택) ── */}
        <SectionCard title="참고 이미지 (선택)">
          <input
            ref={refInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            multiple
            style={{ display: 'none' }}
            onChange={e => addRefImages(e.target.files)}
          />

          {/* 기존 이미지 미리보기 */}
          {existingImages.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              {existingImages.map((img, i) => (
                <div key={i} style={{ position: 'relative', width: 88, height: 88, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => setExistingImages(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'oklch(0% 0 0 / 55%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 신규 이미지 미리보기 */}
          {refImages.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              {refImages.map(img => (
                <div key={img.id} style={{ position: 'relative', width: 88, height: 88, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={() => removeRefImage(img.id)}
                    style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: '50%', background: 'oklch(0% 0 0 / 55%)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 0 }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 업로드 존 */}
          {existingImages.length + refImages.length < 5 && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addRefImages(e.dataTransfer.files); }}
              onClick={() => refInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? C.primary : C.border}`,
                borderRadius: 10, padding: '24px 16px',
                background: dragOver ? C.primaryBg : C.pageBg,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                cursor: 'pointer', transition: '150ms ease', textAlign: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dragOver ? C.primary : C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: dragOver ? C.primary : C.textPri }}>
                  클릭하거나 이미지를 드래그하여 업로드
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
                  JPG, PNG, WEBP, HEIC · 최대 5장 · 장당 10MB
                </div>
              </div>
            </div>
          )}
          {imageError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '10px 12px', background: 'oklch(95% 0.04 25)', border: '1px solid oklch(85% 0.06 25)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.danger }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {imageError}
            </div>
          )}
        </SectionCard>

        {/* ── 하단 버튼 ── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingBottom: 40 }}>
          <button
            type="button"
            onClick={() => router.push('/admin/tasks')}
            style={{
              padding: '11px 28px', borderRadius: 8,
              border: `1.5px solid ${C.border}`, background: '#fff',
              fontSize: 14, fontWeight: 600, color: C.textSec,
              cursor: 'pointer', fontFamily: 'inherit', transition: '150ms ease',
            }}
          >
            취소
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => handleClickSave(true)}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '11px 22px', borderRadius: 8,
                border: `1.5px solid ${C.primary}`, background: '#fff', color: C.primary,
                fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: '150ms ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              바로 저장하기
            </button>
          )}
          <button
            type="button"
            onClick={() => handleClickSave(false)}
            disabled={saving}
            style={{
              padding: '11px 32px', borderRadius: 8, border: 'none',
              background: saving ? 'oklch(75% 0.08 195)' : C.primary, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px oklch(55% 0.14 195 / 30%)',
              transition: '150ms ease',
            }}
          >
            {saving ? '저장 중...' : isEdit ? '수정 저장' : '업무 생성'}
          </button>
        </div>
      </div>

      {/* ── 확인 팝업 (Portal — 스크롤 컨테이너 밖 body에 렌더) ── */}
      {/* ── 성공 토스트 ── */}
      {submitted && createPortal(
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'oklch(18% 0.01 260)', color: '#fff', padding: '16px 28px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 500, boxShadow: '0 8px 32px oklch(0% 0 0 / 30%)', display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(62% 0.15 160)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {isDirect ? '아카이브에 바로 저장되었습니다.' : `업무가 ${isEdit ? '수정' : '생성'}되었습니다.`}
        </div>,
        document.body
      )}

      {showConfirm && createPortal(
        <div
          onClick={() => setShowConfirm(false)}
          style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 360, background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)', padding: '28px 24px 20px' }}
          >
            <p style={{ fontSize: 16, fontWeight: 700, color: C.textPri, marginBottom: 20, textAlign: 'center' }}>
              {isDirect ? '업무를 생성하고 바로 아카이브에 저장하시겠습니까?' : isEdit ? '업무를 수정하시겠습니까?' : '새로운 업무를 생성하시겠습니까?'}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 14, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => { setShowConfirm(false); handleSave(); }}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(55% 0.14 195 / 30%)' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
