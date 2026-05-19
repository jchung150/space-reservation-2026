'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import EmployeeHeader from '@/components/employee/EmployeeHeader';

const C = {
  primary:  'oklch(55% 0.14 195)',
  primaryBg:'oklch(93% 0.06 195)',
  danger:   'oklch(62% 0.16 25)',
  dangerBg: 'oklch(96% 0.04 25)',
  success:  'oklch(62% 0.15 160)',
  successBg:'oklch(92% 0.06 160)',
  warning:  'oklch(65% 0.16 65)',
  warningBg:'oklch(95% 0.05 85)',
  border:   'oklch(88% 0.008 240)',
  pageBg:   'oklch(95% 0.005 220)',
  textPri:  'oklch(18% 0.01 260)',
  textSec:  'oklch(50% 0.01 260)',
  textMuted:'oklch(65% 0.01 260)',
};

const MAX_PHOTOS = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
interface PhotoItem { id: string; file: File; preview: string; }

const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

type DeadlinePreset = 'now' | 'tomorrow' | 'custom';
const PRESETS: { key: DeadlinePreset; label: string }[] = [
  { key: 'now',      label: '지금' },
  { key: 'tomorrow', label: '내일' },
  { key: 'custom',   label: '직접 입력' },
];

const PRIORITY = [
  { key: 'high',   label: '높음', color: C.danger,  bg: C.dangerBg  },
  { key: 'medium', label: '보통', color: C.warning, bg: C.warningBg },
  { key: 'low',    label: '낮음', color: 'oklch(45% 0.15 160)', bg: 'oklch(92% 0.06 160)' },
] as const;



export default function RequestPage() {
  const router = useRouter();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.json()),
    staleTime: Infinity,
  });

  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low' | ''>('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [submitError,  setSubmitError]  = useState('');
  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused,  setDescFocused]  = useState(false);

  const [deadlinePreset, setDeadlinePreset] = useState<DeadlinePreset | ''>('');
  const [customDate,     setCustomDate]     = useState('');
  const [customYear,     setCustomYear]     = useState('');
  const [customMonth,    setCustomMonth]    = useState('');
  const [customDay,      setCustomDay]      = useState('');
  const [customTime,     setCustomTime]     = useState('');
  const [photos,         setPhotos]         = useState<PhotoItem[]>([]);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (photos.length >= MAX_PHOTOS) break;
      if (!file.type.startsWith('image/') && !file.name.match(/\.(heic|heif)$/i)) continue;
      if (file.size > MAX_FILE_BYTES) continue;
      const preview = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, file, preview }]);
    }
    if (galleryRef.current) galleryRef.current.value = '';
    if (cameraRef.current)  cameraRef.current.value  = '';
    setShowPhotoSheet(false);
  }

  function removePhoto(id: string) {
    setPhotos(prev => {
      const t = prev.find(p => p.id === id);
      if (t) URL.revokeObjectURL(t.preview);
      return prev.filter(p => p.id !== id);
    });
  }

  // customYear/Month/Day 변경 시 customDate 자동 동기화
  useEffect(() => {
    if (customYear && customMonth && customDay) {
      const maxDay = new Date(Number(customYear), Number(customMonth), 0).getDate();
      const safeDay = Math.min(Number(customDay), maxDay);
      setCustomDate(`${customYear}-${customMonth.padStart(2,'0')}-${String(safeDay).padStart(2,'0')}`);
    } else {
      setCustomDate('');
    }
  }, [customYear, customMonth, customDay]);

  // 연도 옵션: 올해 ~ 내년
  const now2 = new Date();
  const YEARS = [now2.getFullYear(), now2.getFullYear() + 1];
  const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
  const daysInMonth = customYear && customMonth
    ? new Date(Number(customYear), Number(customMonth), 0).getDate()
    : 31;
  const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  function computeDeadline(): string | null {
    const now = new Date();
    if (deadlinePreset === 'now')      return now.toISOString();
    if (deadlinePreset === 'tomorrow') {
      const d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return d.toISOString();
    }
    if (deadlinePreset === 'custom') {
      if (!customDate) return null;
      const time = customTime || '14:00';
      return new Date(`${customDate}T${time}:00`).toISOString();
    }
    return null;
  }

  function formatPreview(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]}) ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const deadlineValid = !!deadlinePreset && (deadlinePreset !== 'custom' || !!customDate);
  const [errors, setErrors] = useState<{ title?: string; priority?: string; deadline?: string }>({});

  async function handleSubmit() {
    const newErrors: { title?: string; priority?: string; deadline?: string } = {};
    if (!title.trim())    newErrors.title    = '업무명을 입력해주세요';
    if (!priority)        newErrors.priority = '우선순위를 선택해주세요';
    if (!deadlineValid)   newErrors.deadline = deadlinePreset === 'custom' && !customDate ? '날짜를 선택해주세요' : '예상 완료 일시를 선택해주세요';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/tasks/self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:       title.trim(),
          description: desc.trim() || undefined,
          priority: priority as 'high' | 'medium' | 'low',
          deadline:    computeDeadline(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSubmitError(d.error ?? '업무 생성에 실패했습니다.');
        return;
      }
      const { id } = await res.json();

      if (photos.length > 0) {
        const form = new FormData();
        for (const p of photos) form.append('images', p.file, p.file.name);
        await fetch(`/api/tasks/${id}/images`, { method: 'POST', body: form });
      }

      setSubmitted(true);
    } catch {
      setSubmitError('네트워크 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── 제출 완료 화면 ────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <EmployeeHeader userName={me?.name ?? '...'} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: C.successBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, animation: 'circlePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.textPri, marginBottom: 10, textAlign: 'center' }}>
          업무가 생성되었습니다.
        </div>
        <div style={{ fontSize: 14, color: C.textSec, textAlign: 'center', lineHeight: 1.7, marginBottom: 32 }}>
          업무 목록에서 방금 생성한 업무를 확인할 수 있어요.
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" onClick={() => router.push('/tasks')}
            style={{ width: '100%', padding: '15px', borderRadius: 10, border: 'none', background: C.primary, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minHeight: 48 }}>
            업무 목록으로 돌아가기
          </button>
          <button type="button" onClick={() => { setSubmitted(false); setTitle(''); setDesc(''); setPriority(''); setDeadlinePreset(''); setCustomDate(''); setCustomYear(''); setCustomMonth(''); setCustomDay(''); setCustomTime(''); setPhotos([]); setErrors({}); setTimeout(() => scrollRef.current?.scrollTo(0, 0), 0); }}
            style={{ width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: 'none', color: C.textSec, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            다른 업무 추가 생성
          </button>
        </div>
      </div>
      </div>
    );
  }

  // ── 폼 화면 ──────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.pageBg, position: 'relative' }}>

      {/* 공통 헤더 */}
      <EmployeeHeader userName={me?.name ?? '...'} />


      {/* 스크롤 영역 */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 0' }}>

        {/* 기본 정보 */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 12 }}>
          {/* 섹션 헤더 */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, background: C.pageBg }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>기본 정보</span>
          </div>
          <div style={{ padding: '16px' }}>

            {/* 업무명 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>업무명</span>
                <span style={{ color: C.danger, fontSize: 14 }}>*</span>
              </div>
              <input type="text" value={title} onChange={e => { setTitle(e.target.value.slice(0, 60)); if (errors.title) setErrors(p => ({ ...p, title: undefined })); }}
                onFocus={() => setTitleFocused(true)} onBlur={() => setTitleFocused(false)}
                placeholder="예: 3층 남자화장실 수도꼭지 누수"
                style={{ width: '100%', height: 48, borderRadius: 8, padding: '0 12px', fontSize: 15, color: C.textPri, fontFamily: 'inherit', outline: 'none', transition: '150ms ease',
                  border: `1.5px solid ${errors.title ? C.danger : titleFocused ? C.primary : C.border}`,
                  background: titleFocused ? '#fff' : C.pageBg,
                  boxShadow: titleFocused && !errors.title ? '0 0 0 3px oklch(55% 0.14 195 / 18%)' : 'none',
                }} />
              {errors.title && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, color: C.danger, fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {errors.title}
                </div>
              )}
            </div>

            {/* 업무 설명 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.textPri, marginBottom: 8 }}>업무 설명 <span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>(선택)</span></div>
              <textarea value={desc} onChange={e => setDesc(e.target.value.slice(0, 500))}
                onFocus={() => setDescFocused(true)} onBlur={() => setDescFocused(false)}
                placeholder="발견한 문제나 필요한 작업을 자세히 설명해주세요"
                rows={4}
                style={{ width: '100%', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: C.textPri, fontFamily: 'inherit', lineHeight: 1.6, resize: 'none', outline: 'none', transition: '150ms ease',
                  border: `1.5px solid ${descFocused ? C.primary : C.border}`,
                  background: descFocused ? '#fff' : C.pageBg,
                  boxShadow: descFocused ? '0 0 0 3px oklch(55% 0.14 195 / 18%)' : 'none',
                }} />
            </div>

            {/* 우선순위 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>우선순위</span>
                <span style={{ color: C.danger, fontSize: 14 }}>*</span>
              </div>
              <div style={{ display: 'flex', gap: 0, background: C.pageBg, border: `1px solid ${errors.priority ? C.danger : C.border}`, borderRadius: 8, padding: 3, width: 'fit-content' }}>
                {PRIORITY.map(p => (
                  <button key={p.key} type="button" onClick={() => { setPriority(p.key); setErrors(prev => ({ ...prev, priority: undefined })); }}
                    style={{ padding: '8px 24px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', transition: '150ms ease', background: priority === p.key ? p.color : 'transparent', color: priority === p.key ? '#fff' : C.textSec }}>
                    {p.label}
                  </button>
                ))}
              </div>
              {errors.priority && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, color: C.danger, fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {errors.priority}
                </div>
              )}
            </div>

            {/* 예상 완료 일시 */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>예상 완료 일시</span>
                <span style={{ color: C.danger, fontSize: 14 }}>*</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 0 }}>
                {PRESETS.map(p => {
                  const active = deadlinePreset === p.key;
                  return (
                    <button key={p.key} type="button" onClick={() => { setDeadlinePreset(p.key); setErrors(prev => ({ ...prev, deadline: undefined })); }}
                      style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${active ? C.primary : C.border}`, background: active ? C.primaryBg : '#fff', color: active ? C.primary : C.textSec, fontSize: 14, fontWeight: active ? 700 : 600, cursor: 'pointer', fontFamily: 'inherit', transition: '150ms ease', minHeight: 40 }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
              {(deadlinePreset === 'now' || deadlinePreset === 'tomorrow') && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: C.primaryBg, borderRadius: 8, fontSize: 13, fontWeight: 600, color: C.primary }}>
                  {formatPreview(computeDeadline())}
                </div>
              )}
              {errors.deadline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: C.danger, fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {errors.deadline}
                </div>
              )}
              {deadlinePreset === 'custom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {/* 연/월/일 드롭다운 */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { label: '년', value: customYear, setter: (v: string) => { setCustomYear(v); setCustomDay(''); setErrors(p => ({ ...p, deadline: undefined })); }, options: YEARS.map(y => ({ v: String(y), l: `${y}년` })) },
                      { label: '월', value: customMonth, setter: (v: string) => { setCustomMonth(v); setCustomDay(''); setErrors(p => ({ ...p, deadline: undefined })); }, options: MONTHS.map(m => ({ v: String(m), l: `${m}월` })) },
                      { label: '일', value: customDay, setter: (v: string) => { setCustomDay(v); setErrors(p => ({ ...p, deadline: undefined })); }, options: DAYS.map(d => ({ v: String(d), l: `${d}일` })) },
                    ].map(sel => (
                      <div key={sel.label} style={{ position: 'relative', flex: 1 }}>
                        <select value={sel.value} onChange={e => sel.setter(e.target.value)}
                          style={{ width: '100%', padding: '12px 28px 12px 12px', borderRadius: 8, border: `1.5px solid ${errors.deadline && !customDate ? C.danger : C.border}`, background: C.pageBg, fontSize: 15, color: sel.value ? C.textPri : C.textMuted, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', minHeight: 48 }}>
                          <option value="">{sel.label}</option>
                          {sel.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    ))}
                  </div>
                  {/* 시간 선택 */}
                  <div style={{ position: 'relative' }}>
                    <select value={customTime} onChange={e => setCustomTime(e.target.value)}
                      style={{ width: '100%', padding: '12px 28px 12px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.pageBg, fontSize: 15, color: customTime ? C.textPri : C.textMuted, outline: 'none', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none', minHeight: 48 }}>
                      <option value="">시간 선택 (기본 오후 2시)</option>
                      {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 사진 */}
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.textPri }}>참고 이미지 <span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>(선택)</span></span>
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{photos.length} / {MAX_PHOTOS}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {photos.map(ph => (
              <div key={ph.id} style={{ position: 'relative', width: 76, height: 76, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <img src={ph.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={() => removePhoto(ph.id)}
                  style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: C.danger, border: '2px solid #fff', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}>
                  ×
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button type="button" onClick={() => setShowPhotoSheet(true)}
                style={{ width: photos.length === 0 ? '100%' : 76, height: 76, borderRadius: 8, border: `2px dashed ${C.border}`, background: C.pageBg, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.textSec, fontFamily: 'inherit' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                {photos.length === 0 && <span style={{ fontSize: 14, fontWeight: 600 }}>이미지 추가 (선택)</span>}
              </button>
            )}
          </div>
        </div>

        <div style={{ height: 96 }} />
      </div>

      {/* 에러 */}
      {submitError && (
        <div style={{ position: 'absolute', bottom: 90, left: 16, right: 16, background: C.danger, color: '#fff', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
          {submitError}
        </div>
      )}

      {/* 하단 버튼 */}
      <div style={{ padding: '12px 16px 16px', background: '#fff', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button type="button" onClick={handleSubmit} disabled={submitting}
          style={{ width: '100%', padding: '15px', borderRadius: 10, border: 'none', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', minHeight: 48, transition: '150ms ease', background: submitting ? 'oklch(75% 0.08 195)' : C.primary, color: '#fff' }}>
          {submitting ? '생성 중...' : '업무 생성'}
        </button>
      </div>

      {/* 파일 인풋 */}
      <input ref={galleryRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)}
        style={{ position: 'fixed', top: -100, left: -100, opacity: 0, width: 1, height: 1 }} aria-hidden="true" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={e => handleFiles(e.target.files)}
        style={{ position: 'fixed', top: -100, left: -100, opacity: 0, width: 1, height: 1 }} aria-hidden="true" />

      {/* 사진 바텀시트 */}
      {showPhotoSheet && (
        <div onClick={() => setShowPhotoSheet(false)} style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 40%)', display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: '#fff', borderRadius: '20px 20px 0 0', padding: '16px 16px 36px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border, margin: '0 auto 16px' }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: C.textPri, marginBottom: 14, textAlign: 'center' }}>사진 추가</div>
            {[
              { label: '카메라로 촬영', sub: '지금 바로 촬영합니다', ref: cameraRef },
              { label: '갤러리에서 선택', sub: '저장된 사진을 선택합니다', ref: galleryRef },
            ].map(item => (
              <button key={item.label} type="button" onClick={() => item.ref.current?.click()}
                style={{ width: '100%', padding: '14px 16px', background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8, fontFamily: 'inherit' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.textSec} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.textPri }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{item.sub}</div>
                </div>
              </button>
            ))}
            <button type="button" onClick={() => setShowPhotoSheet(false)}
              style={{ width: '100%', padding: '13px', border: 'none', background: 'none', fontSize: 15, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit', marginTop: 4, minHeight: 48 }}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
