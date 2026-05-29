'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import type { AdminTask, Priority, TaskStatus } from '@/types';
import { PRIORITY_CONFIG } from '@/constants/task-config';
import { getAdminDueLabel } from '@/lib/date';

/* ── 색상 ────────────────────────────────────────────────────── */
const C = {
  primary: 'oklch(55% 0.14 195)', primaryBg: 'oklch(93% 0.06 195)',
  danger:  'oklch(62% 0.16 25)',  dangerBg:  'oklch(95% 0.04 25)',
  success: 'oklch(62% 0.15 160)', successBg: 'oklch(93% 0.05 160)',
  pending: 'oklch(58% 0.14 280)', pendingBg: 'oklch(94% 0.04 280)',
  warning: 'oklch(65% 0.16 65)',  warningBg: 'oklch(95% 0.05 85)',
  border:  'oklch(88% 0.008 240)', pageBg: 'oklch(95% 0.005 220)',
  textPri: 'oklch(18% 0.01 260)', textSec: 'oklch(50% 0.01 260)', textMuted: 'oklch(65% 0.01 260)',
};

const STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo:           { label: '미완료',      color: C.textSec,  bg: C.pageBg    },
  in_progress:    { label: '진행 중',     color: C.primary,  bg: C.primaryBg },
  pending_review: { label: '검토 대기',   color: C.pending,  bg: C.pendingBg },
  done:           { label: '완료',        color: C.success,  bg: C.successBg },
  rework:         { label: '재작업',     color: C.danger,   bg: C.dangerBg  },
};

const DEPT_COLOR: Record<string, string> = {
  보안: 'oklch(65% 0.16 65)', 청소: 'oklch(62% 0.15 160)', 시설: 'oklch(55% 0.14 195)',
};

const PER_PAGE = 10;

/* ── 서브컴포넌트 ────────────────────────────────────────────── */
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
    <button type="button" disabled={disabled} onClick={onClick} style={{ width: 32, height: 32, borderRadius: 7, border: `1px solid ${active ? C.primary : C.border}`, background: active ? C.primary : disabled ? C.pageBg : '#fff', color: active ? '#fff' : disabled ? C.textMuted : C.textSec, fontSize: 13, fontWeight: active ? 700 : 400, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
      {children}
    </button>
  );
}

/* ── 메인 ────────────────────────────────────────────────────── */
export default function AdminTasksPage() {
  const queryClient = useQueryClient();
  const router      = useRouter();
  const [search,     setSearch]     = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [deptFilter, setDeptFilter] = useState('전체');
  const [prioFilter, setPrioFilter] = useState('전체');
  const [statFilter, setStatFilter] = useState('전체');
  const [page,       setPage]       = useState(1);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  /* ── 데이터 패치 ── */
  const { data, isLoading, isError } = useQuery<{ tasks: AdminTask[]; total: number }>({
    queryKey: ['admin-tasks', deptFilter, prioFilter, statFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (deptFilter !== '전체') params.set('dept',     deptFilter);
      if (prioFilter !== '전체') params.set('priority', prioFilter);
      if (statFilter !== '전체') params.set('status',   statFilter);
      const res = await fetch(`/api/admin/tasks?${params}`);
      if (!res.ok) throw new Error('fetch error');
      return res.json();
    },
    staleTime: 0,            // 항상 최신 데이터 사용
    refetchOnWindowFocus: true, // 탭 전환/포커스 시 자동 갱신
  });

  /* ── 삭제 뮤테이션 ── */
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' }).then(r => {
        if (!r.ok) throw new Error('삭제 실패');
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
      setDeletingId(null);
    },
  });

  /* ── 클라이언트 검색 + 페이지네이션 ── */
  const allTasks = data?.tasks ?? [];
  const filteredTasks = useMemo(() => {
    if (!search.trim() || isComposing) return allTasks;
    return allTasks.filter(t => t.title.includes(search) || t.employeeName.includes(search));
  }, [allTasks, search, isComposing]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pagedTasks = filteredTasks.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const pageNums = useMemo(() => {
    const half = 2;
    let start = Math.max(1, safePage - half);
    const end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [safePage, totalPages]);

  const allChecked  = pagedTasks.length > 0 && pagedTasks.every(t => selected.has(t.id));
  const someChecked = pagedTasks.some(t => selected.has(t.id)) && !allChecked;

  function toggleAll() {
    setSelected(prev => {
      const next = new Set(prev);
      if (allChecked) pagedTasks.forEach(t => next.delete(t.id));
      else            pagedTasks.forEach(t => next.add(t.id));
      return next;
    });
  }
  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function bulkDelete() {
    selected.forEach(id => deleteMutation.mutate(id));
    setSelected(new Set());
  }

  return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri }}>업무 관리</h1>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>전체 업무를 조회하고 관리하세요</p>
        </div>
        <Link href="/admin/tasks/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 2px 8px oklch(55% 0.14 195 / 30%)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          새 업무 생성
        </Link>
      </div>

      {/* 필터 바 */}
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 200px', minWidth: 200 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: '0.04em', paddingLeft: 2 }}>검색</span>
          <div style={{ position: 'relative' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={e => { setIsComposing(false); setSearch((e.target as HTMLInputElement).value); }}
              onFocus={e => (e.target.style.borderColor = C.primary)}
              onBlur={e  => (e.target.style.borderColor = C.border)}
              placeholder="업무명 또는 직원 이름 검색"
              style={{ width: '100%', padding: '7px 12px 7px 34px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.textPri, outline: 'none', fontFamily: 'inherit', background: C.pageBg, transition: '150ms ease' }}
            />
          </div>
        </div>
        <FilterSelect label="상태"   value={statFilter} onChange={v => { setStatFilter(v); setPage(1); }} options={['전체','미완료','검토 대기','완료','재작업']} minWidth={140} />
        <FilterSelect label="우선순위" value={prioFilter} onChange={v => { setPrioFilter(v); setPage(1); }} options={['전체','높음','보통','낮음']} minWidth={110} />
        <FilterSelect label="직군"   value={deptFilter} onChange={v => { setDeptFilter(v); setPage(1); }} options={['전체','보안','청소','시설유지보수']} minWidth={130} />
        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', padding: '4px 12px', background: C.primaryBg, borderRadius: 8, border: '1px solid oklch(80% 0.08 195)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>{selected.size}건 선택됨</span>
            <button type="button" onClick={bulkDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.danger, fontWeight: 600, fontFamily: 'inherit' }}>삭제</button>
          </div>
        )}
      </div>

      {/* 테이블 */}
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
        {isLoading && (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>불러오는 중...</div>
        )}
        {isError && (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: C.danger, fontSize: 14 }}>업무 목록을 불러오지 못했습니다.</div>
        )}
        {!isLoading && !isError && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '11px 16px', width: 44, textAlign: 'center' }}>
                  <div role="checkbox" aria-checked={someChecked ? 'mixed' : allChecked} tabIndex={0}
                    onClick={toggleAll} onKeyDown={e => e.key === ' ' && toggleAll()}
                    style={{ width: 16, height: 16, borderRadius: 4, cursor: 'pointer', border: `2px solid ${allChecked || someChecked ? C.primary : C.border}`, background: allChecked || someChecked ? C.primary : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '150ms ease', outline: 'none' }}>
                    {allChecked && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    {someChecked && !allChecked && <div style={{ width: 8, height: 2, background: 'white', borderRadius: 1 }} />}
                  </div>
                </th>
                {['업무명','담당자','직군','우선순위','마감일시','상태','반복','수정/삭제'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: C.textMuted, textAlign: 'left', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedTasks.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>조건에 맞는 업무가 없습니다</td></tr>
              ) : pagedTasks.map(task => {
                const p        = PRIORITY_CONFIG[task.priority];
                const s        = STATUS_CFG[task.status];
                const dueStr   = getAdminDueLabel(task.deadline);
                const isToday  = dueStr.startsWith('오늘');
                const isOverdue = new Date(task.deadline) < new Date() && task.status !== 'done';
                const isSel    = selected.has(task.id);
                const isHov    = hoveredRow === task.id && !isSel;
                const deptClr  = DEPT_COLOR[task.dept] ?? C.textMuted;
                const isDel    = deletingId === task.id;
                return (
                  <tr key={task.id}
                    onClick={() => router.push(`/admin/tasks/${task.id}`)}
                    onMouseEnter={() => setHoveredRow(task.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ borderTop: `1px solid ${C.border}`, background: isSel ? C.primaryBg : isHov ? C.pageBg : 'transparent', transition: '120ms', cursor: 'pointer' }}>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div onClick={e => { e.stopPropagation(); toggleOne(task.id); }}
                        style={{ width: 16, height: 16, borderRadius: 4, cursor: 'pointer', border: `2px solid ${isSel ? C.primary : C.border}`, background: isSel ? C.primary : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '150ms ease' }}>
                        {isSel && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: C.textPri }}>{task.title}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>{task.employeeName}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: deptClr, background: `${deptClr}18`, borderRadius: 6, padding: '3px 8px' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: deptClr, flexShrink: 0 }} />{task.dept}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: p.color, background: p.bgColor, borderRadius: 6, padding: '3px 8px' }}>{p.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: isOverdue || isToday ? C.danger : C.textSec, fontWeight: isOverdue || isToday ? 600 : 400 }}>{dueStr}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>{s.label}</span>
                    </td>
                    {/* 반복 컬럼 */}
                    <td style={{ padding: '12px 16px' }}>
                      {task.repeatType && task.repeatType !== 'none' ? (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: C.primary, background: C.primaryBg,
                          borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap',
                        }}>
                          {{ daily:'매일', weekly:'매주', monthly:'매월', yearly:'매년' }[task.repeatType] ?? task.repeatType}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: C.textMuted }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      {isDel ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 12, color: C.danger, fontWeight: 600 }}>삭제할까요?</span>
                          <button type="button" onClick={() => deleteMutation.mutate(task.id)}
                            style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: C.danger, border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>확인</button>
                          <button type="button" onClick={() => setDeletingId(null)}
                            style={{ fontSize: 12, fontWeight: 600, color: C.textSec, background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {/* 수정 */}
                          <Link href={`/admin/tasks/${task.id}/edit`} title="수정" className="admin-btn-icon admin-btn-edit" onClick={e => e.stopPropagation()}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </Link>
                          {/* 삭제 */}
                          <button type="button" title="삭제" className="admin-btn-icon admin-btn-delete" onClick={e => { e.stopPropagation(); setDeletingId(task.id); }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: C.textMuted }}>총 {filteredTasks.length}건 · 페이지 {safePage} / {totalPages}</span>
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
    </div>
  );
}
