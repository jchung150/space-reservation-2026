'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PRIORITY_CONFIG } from '@/constants/task-config';

const C = {
  primary:   'oklch(55% 0.14 195)', primaryBg: 'oklch(93% 0.06 195)',
  danger:    'oklch(62% 0.16 25)',
  success:   'oklch(62% 0.15 160)', successBg: 'oklch(93% 0.05 160)',
  warning:   'oklch(65% 0.16 65)',
  border:    'oklch(88% 0.008 240)', pageBg: 'oklch(95% 0.005 220)',
  archive:   'oklch(96% 0.008 240)',
  textPri:   'oklch(18% 0.01 260)', textSec: 'oklch(50% 0.01 260)',
  textMuted: 'oklch(65% 0.01 260)',
};

const DEPT_COLOR: Record<string, string> = {
  보안: 'oklch(65% 0.16 65)', 청소: 'oklch(62% 0.15 160)', 시설: 'oklch(55% 0.14 195)',
};

const PRIORITY_LABEL: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' };

const PER_PAGE = 10;

/* ── 서브 컴포넌트 ─────────────────────────────────────────────── */
function FilterSelect({ label, value, onChange, options, minWidth = 120 }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; minWidth?: number;
}) {
  const isActive = value !== '전체';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: isActive ? C.primary : C.textMuted, letterSpacing: '0.04em', paddingLeft: 2 }}>{label}</span>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <select className="admin-select" value={value} onChange={e => onChange(e.target.value)}
          style={{ padding: '7px 32px 7px 12px', borderRadius: 8, border: `1.5px solid ${isActive ? C.primary : C.border}`, background: isActive ? C.primaryBg : '#fff', color: isActive ? C.primary : C.textPri, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minWidth, outline: 'none' }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isActive ? C.primary : C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

function PageBtn({ children, active = false, disabled = false, onClick }: {
  children: React.ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${active ? C.primary : C.border}`, background: active ? C.primary : disabled ? C.pageBg : '#fff', color: active ? '#fff' : disabled ? C.textMuted : C.textSec, fontSize: 13, fontWeight: active ? 700 : 400, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
      {children}
    </button>
  );
}

/* ── 상세 보기 모달 ──────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DetailModal({ item, onClose }: { item: any; onClose: () => void }) {
  const p       = PRIORITY_CONFIG[item.priority as 'high' | 'medium' | 'low'] ?? PRIORITY_CONFIG.medium;
  const deptClr = DEPT_COLOR[item.dept] ?? C.textMuted;
  const [chov,       setChov]       = useState(false);
  const [photoIdx,   setPhotoIdx]   = useState(0);
  const [lightbox,   setLightbox]   = useState(false);

  const photos: Array<{ id: string; storagePath: string; fileName: string; url: string | null }> =
    item.photos ?? [];

  // 플레이스홀더 색상 (Storage URL 없을 때)
  const THUMB_COLORS = [
    'oklch(72% 0.09 195)', 'oklch(75% 0.09 145)',
    'oklch(78% 0.08 50)',  'oklch(72% 0.09 280)', 'oklch(79% 0.07 25)',
  ];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, animation: 'fadeIn 0.2s ease', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 680, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)', animation: 'scaleIn 0.25s cubic-bezier(0.34,1.2,0.64,1)' }}>

        {/* 헤더 */}
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.06em', marginBottom: 2 }}>완료 보고 상세</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPri }}>{item.title}</h2>
          </div>
          <button type="button" onClick={onClose}
            onMouseEnter={() => setChov(true)} onMouseLeave={() => setChov(false)}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: chov ? C.pageBg : 'transparent', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* 바디 */}
        <div style={{ padding: 22 }}>
          {/* 배지 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: p.color, background: p.bgColor, borderRadius: 6, padding: '3px 8px' }}>{p.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: deptClr, background: `${deptClr}18`, borderRadius: 6, padding: '3px 8px' }}>{item.dept}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.success, background: C.successBg, borderRadius: 6, padding: '3px 8px' }}>● 완료 확정</span>
          </div>

          {/* ── 첨부 사진 ── */}
          {photos.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 10, letterSpacing: '0.04em' }}>
                직원 제출 사진 ({photos.length}장)
              </div>

              {/* 메인 사진 */}
              <div
                role="button" tabIndex={0}
                onClick={() => setLightbox(true)}
                onKeyDown={e => e.key === 'Enter' && setLightbox(true)}
                style={{
                  width: '100%', height: 220, borderRadius: 10,
                  background: THUMB_COLORS[photoIdx % THUMB_COLORS.length],
                  overflow: 'hidden', position: 'relative',
                  cursor: 'pointer', marginBottom: 8, outline: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {photos[photoIdx]?.url
                  ? <img src={photos[photoIdx].url!} alt={`사진 ${photoIdx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                }
                {/* 확대 힌트 */}
                <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.35)', borderRadius: 6, padding: 5, display: 'flex' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                  </svg>
                </div>
                {/* 이전 */}
                {photoIdx > 0 && (
                  <button type="button" onClick={e => { e.stopPropagation(); setPhotoIdx(i => i - 1); }}
                    style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                )}
                {/* 다음 */}
                {photoIdx < photos.length - 1 && (
                  <button type="button" onClick={e => { e.stopPropagation(); setPhotoIdx(i => i + 1); }}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                )}
              </div>

              {/* 썸네일 */}
              <div style={{ display: 'flex', gap: 8 }}>
                {photos.map((ph, i) => (
                  <div key={ph.id} role="button" tabIndex={0}
                    onClick={() => setPhotoIdx(i)}
                    onKeyDown={e => e.key === 'Enter' && setPhotoIdx(i)}
                    style={{
                      width: 64, height: 48, borderRadius: 6,
                      background: THUMB_COLORS[i % THUMB_COLORS.length],
                      flexShrink: 0, overflow: 'hidden', cursor: 'pointer',
                      border: `2px solid ${photoIdx === i ? C.primary : 'transparent'}`,
                      transition: '150ms ease', outline: 'none', position: 'relative',
                    }}
                  >
                    {ph.url
                      ? <img src={ph.url} alt={`사진 ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : null
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 참고 이미지 */}
          {(item.referenceImages ?? []).length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, letterSpacing: '0.04em' }}>
                참고 이미지 ({item.referenceImages.length}장)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {item.referenceImages.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}`, flexShrink: 0 }}>
                    <img src={url} alt={`참고 이미지 ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 직원 메모 */}
          {item.memo && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 6, letterSpacing: '0.04em' }}>직원 메모</div>
              <div style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', fontSize: 13, color: C.textPri, lineHeight: 1.7 }}>{item.memo}</div>
            </div>
          )}

          {/* 처리 내역 */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, marginBottom: 8, letterSpacing: '0.04em' }}>처리 내역</div>
            <div style={{ background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
              {[
                { label: '담당자',   val: item.employee },
                { label: '완료일시', val: item.completedAt },
                { label: '소요 시간', val: item.duration },
                { label: '검토자',    val: item.reviewer },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <span style={{ fontSize: 12, color: C.textMuted }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 라이트박스 */}
      {lightbox && (
        <div onClick={() => setLightbox(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'oklch(5% 0 0 / 92%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ width: 560, height: 420, borderRadius: 14, background: THUMB_COLORS[photoIdx % THUMB_COLORS.length], overflow: 'hidden', flexShrink: 0 }}>
            {photos[photoIdx]?.url
              ? <img src={photos[photoIdx].url!} alt={`사진 ${photoIdx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : null
            }
          </div>
          <span style={{ color: 'oklch(70% 0 0)', fontSize: 13 }}>사진 {photoIdx + 1}/{photos.length} · 탭하면 닫힙니다</span>
          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {photos.map((_, i) => (
                <span key={i} onClick={e => { e.stopPropagation(); setPhotoIdx(i); }}
                  style={{ width: 7, height: 7, borderRadius: '50%', background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: '150ms ease' }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────────── */
export default function ArchivePage() {
  const [search,     setSearch]     = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [period,     setPeriod]     = useState('직접 입력');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');
  const [deptFilter, setDeptFilter] = useState('전체');
  const [prioFilter, setPrioFilter] = useState('전체');
  const [page,       setPage]       = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const router = useRouter();
  const [deleteError,  setDeleteError]  = useState('');
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '삭제에 실패했습니다.');
      }
    },
    onSuccess: () => {
      setDeleteTarget(null);
      setDeleteError('');
      queryClient.invalidateQueries({ queryKey: ['archive'] });
    },
    onError: (err: Error) => {
      setDeleteError(err.message);
    },
  });

  /* ── API ── */
  const { data, isLoading, isError } = useQuery({
    queryKey: ['archive', deptFilter, prioFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (deptFilter !== '전체') params.set('dept',     deptFilter);
      if (prioFilter !== '전체') params.set('priority', prioFilter);
      const res = await fetch(`/api/admin/archive?${params}`);
      if (!res.ok) throw new Error('fetch error');
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTasks: any[]  = data?.tasks  ?? [];
  const stats             = data?.stats  ?? { total: 0, done: 0, notDone: 0 };

  /* 기간 범위 계산 */
  const { rangeFrom, rangeTo } = useMemo(() => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === '이번 주') {
      const dow   = today.getDay();
      const start = new Date(today); start.setDate(today.getDate() - dow);
      const end   = new Date(start);  end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      return { rangeFrom: start, rangeTo: end };
    }
    if (period === '이번 달') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      return { rangeFrom: start, rangeTo: end };
    }
    if (period === '직접 입력') {
      const start = dateFrom ? new Date(dateFrom) : null;
      const end   = dateTo   ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : null;
      return { rangeFrom: start, rangeTo: end };
    }
    return { rangeFrom: null, rangeTo: null };
  }, [period, dateFrom, dateTo]);

  /* 클라이언트 검색 + 기간 필터 */
  const filtered = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any[] = allTasks;

    if (rangeFrom || rangeTo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = result.filter((t: any) => {
        const d = new Date(t.completedAtRaw);
        if (rangeFrom && d < rangeFrom) return false;
        if (rangeTo   && d > rangeTo)   return false;
        return true;
      });
    }

    if (search.trim() && !isComposing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = result.filter((t: any) =>
        t.title.includes(search) ||
        t.employee.includes(search) ||
        (t.description ?? '').includes(search) ||
        (t.memo ?? '').includes(search)
      );
    }

    return result;
  }, [allTasks, search, isComposing, rangeFrom, rangeTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pagedItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const pageNums = useMemo(() => {
    const half = 2;
    let start = Math.max(1, safePage - half);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [safePage, totalPages]);

  return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>

      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri }}>업무 아카이브</h1>
        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>완료 확정된 업무 이력을 조회하세요</p>
      </div>

      {/* 필터 바 */}
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: 14, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 220px', minWidth: 220 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.04em', paddingLeft: 2 }}>검색</span>
          <div style={{ position: 'relative' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={e => { setIsComposing(false); setSearch((e.target as HTMLInputElement).value); }}
              onFocus={e => (e.target.style.borderColor = C.primary)}
              onBlur={e  => (e.target.style.borderColor = C.border)}
              placeholder="업무명, 직원, 업무 설명, 메모 검색"
              style={{ width: '100%', padding: '7px 12px 7px 34px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.textPri, outline: 'none', fontFamily: 'inherit', background: C.pageBg }} />
          </div>
        </div>
        {/* 기간 세그먼트 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.04em', paddingLeft: 2 }}>기간</span>
          <div style={{ display: 'flex', gap: 0, background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
            {(['이번 주', '이번 달', '직접 입력'] as const).map(p => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', background: period === p ? C.primary : 'transparent', color: period === p ? '#fff' : C.textSec, transition: '150ms ease' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <FilterSelect label="직군"   value={deptFilter} onChange={v => { setDeptFilter(v); setPage(1); }} options={['전체', '보안', '청소', '시설유지보수']} minWidth={130} />
        <FilterSelect label="우선순위" value={prioFilter} onChange={v => { setPrioFilter(v); setPage(1); }} options={['전체', '높음', '보통', '낮음']} minWidth={110} />
        <button type="button"
          onClick={() => {
            const PRIO: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' };
            const headers = [
              '업무명', '업무 설명', '건물', '업무 유형', '담당자', '직군', '배정자', '배정일시',
              '마감일시', '우선순위', '완료일시', '소요 시간', '검토자', '메모', '제출 사진 수',
            ];
            const rows = filtered.map((t: any) => [
              t.title,
              (t.description ?? '').replace(/\n/g, ' '),
              t.buildingName ?? '—',
              t.taskTypeName ?? '—',
              t.employee,
              t.dept,
              t.assignedBy ?? '—',
              t.assignedAt ?? '—',
              t.deadline ?? '—',
              PRIO[t.priority as string] ?? t.priority,
              t.completedAt,
              t.duration ?? '—',
              t.reviewer,
              (t.memo ?? '').replace(/\n/g, ' '),
              t.photoCount ?? t.photos?.length ?? 0,
            ]);
            const csv = [headers, ...rows]
              .map(row => row.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
              .join('\n');
            const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = `업무아카이브_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          엑셀 내보내기
        </button>
      </div>

      {/* 날짜 직접 입력 */}
      {period === '직접 입력' && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, letterSpacing: '0.04em' }}>기간</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="admin-select" style={{ padding: '7px 10px', borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.pageBg, fontSize: 13, color: C.textPri, outline: 'none', fontFamily: 'inherit' }} />
          <span style={{ fontSize: 13, color: C.textMuted }}>~</span>
          <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   className="admin-select" style={{ padding: '7px 10px', borderRadius: 7, border: `1.5px solid ${C.border}`, background: C.pageBg, fontSize: 13, color: C.textPri, outline: 'none', fontFamily: 'inherit' }} />
        </div>
      )}

      {/* 테이블 */}
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>불러오는 중...</div>
        ) : isError ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: C.danger, fontSize: 14 }}>데이터를 불러오지 못했습니다.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.archive, borderBottom: `1px solid ${C.border}` }}>
                {['업무명', '담당자', '직군', '우선순위', '완료일시', '검토자', '삭제'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.textMuted, textAlign: 'left', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedItems.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>완료된 업무가 없습니다</td></tr>
              ) : pagedItems.map((item: any) => {
                const p      = PRIORITY_CONFIG[item.priority as 'high' | 'medium' | 'low'] ?? PRIORITY_CONFIG.medium;
                const deptClr = DEPT_COLOR[item.dept] ?? C.textMuted;
                return (
                  <tr key={item.id}
                    onClick={() => router.push(`/admin/archive/${item.id}`)}
                    onMouseEnter={e => (e.currentTarget.style.background = C.pageBg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    style={{ borderTop: `1px solid ${C.border}`, transition: '120ms', cursor: 'pointer' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.textPri }}>{item.title}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>{item.employee}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: deptClr, background: `${deptClr}18`, borderRadius: 6, padding: '3px 8px' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: deptClr, flexShrink: 0 }} />{item.dept}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: p.color, background: p.bgColor, borderRadius: 6, padding: '3px 8px' }}>{p.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec, fontVariantNumeric: 'tabular-nums' }}>{item.completedAt}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>
                      {!item.hasApprovedReport ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.primary, background: C.primaryBg, borderRadius: 6, padding: '3px 8px' }}>직접 기록</span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: C.primaryBg, color: C.primary, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>관</span>
                          {item.reviewer}
                        </span>
                      )}
                    </td>
                    {/* 삭제 */}
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      <button type="button" className="admin-btn-icon admin-btn-delete"
                        onClick={() => { setDeleteTarget({ id: item.id, title: item.title }); setDeleteError(''); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
        <span style={{ fontSize: 13, color: C.textMuted }}>총 {filtered.length}건 · 페이지 {safePage} / {totalPages}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <PageBtn disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </PageBtn>
          {pageNums.map(n => <PageBtn key={n} active={n === safePage} onClick={() => setPage(n)}>{n}</PageBtn>)}
          <PageBtn disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </PageBtn>
        </div>
      </div>


      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
          style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 380, background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)', padding: '28px 24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'oklch(95% 0.04 25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.textPri, marginBottom: 3 }}>업무를 삭제하시겠습니까?</p>
                <p style={{ fontSize: 13, color: C.textMuted }}>
                  <span style={{ fontWeight: 600, color: C.textPri }}>"{deleteTarget.title}"</span> 업무가 영구 삭제됩니다.
                </p>
              </div>
            </div>
            {deleteError && (
              <p style={{ fontSize: 12, color: C.danger, fontWeight: 600, marginBottom: 12, padding: '8px 12px', background: 'oklch(95% 0.04 25)', borderRadius: 8 }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 14, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>
                취소
              </button>
              <button type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: deleteMutation.isPending ? 'oklch(75% 0.08 25)' : C.danger, color: '#fff', fontSize: 14, fontWeight: 700, cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
