'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MasterHeaderContext } from '../layout';

const C = {
  primary:    'oklch(55% 0.14 195)', primaryBg: 'oklch(93% 0.06 195)',
  danger:     'oklch(62% 0.16 25)',  dangerBg:  'oklch(95% 0.04 25)',
  success:    'oklch(62% 0.15 160)', successBg: 'oklch(93% 0.05 160)',
  border:     'oklch(88% 0.008 240)', pageBg:    'oklch(95% 0.005 220)',
  inactiveBg: 'oklch(96% 0.003 240)',
  textPri:    'oklch(18% 0.01 260)', textSec: 'oklch(50% 0.01 260)',
  textMuted:  'oklch(65% 0.01 260)',
};

interface TaskTypeRow {
  id:        string;
  name:      string;
  jobType:   string;
  sortOrder: number;
  isActive:  boolean;
  createdAt: string;
}

export default function TaskTypesPage() {
  const qc = useQueryClient();
  const { data: types = [], isLoading } = useQuery<TaskTypeRow[]>({
    queryKey: ['task-types-all'],
    queryFn: async () => {
      const res = await fetch('/api/admin/task-types');
      if (!res.ok) throw new Error('fetch error');
      return res.json();
    },
    staleTime: 0,
  });

  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState<TaskTypeRow | null>(null);
  const [name, setName]                 = useState('');
  const [sortOrder, setSortOrder]       = useState<number>(0);
  const [formError, setFormError]       = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TaskTypeRow | null>(null);
  const [deleteError, setDeleteError]   = useState('');
  const [toast, setToast]               = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 1600);
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setSortOrder((types[types.length - 1]?.sortOrder ?? 0) + 10);
    setFormError('');
    setShowForm(true);
  }

  /* 헤더 우측에 "유형 추가" 버튼 등록 (ref로 최신 openCreate 참조) */
  const { setAction } = useContext(MasterHeaderContext);
  const openCreateRef = useRef(openCreate);
  openCreateRef.current = openCreate;
  useEffect(() => {
    setAction(
      <button type="button" onClick={() => openCreateRef.current()}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(55% 0.14 195 / 30%)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        새 유형 추가
      </button>
    );
    return () => setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit(t: TaskTypeRow) {
    setEditing(t);
    setName(t.name);
    setSortOrder(t.sortOrder);
    setFormError('');
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('유형명을 입력해주세요.');
      const url    = editing ? `/api/admin/task-types/${editing.id}` : '/api/admin/task-types';
      const method = editing ? 'PATCH' : 'POST';
      const body: Record<string, unknown> = { name: trimmed, sortOrder };
      // 신규 생성 시 직군 기본값 필요 (DB CHECK 제약)
      if (!editing) body.jobType = 'maintenance';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '저장에 실패했습니다.');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-types-all'] });
      qc.invalidateQueries({ queryKey: ['task-types-active'] });
      setShowForm(false);
      showToast(editing ? '업무 유형이 수정되었습니다.' : '업무 유형이 추가되었습니다.');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (t: TaskTypeRow) => {
      const res = await fetch(`/api/admin/task-types/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '변경에 실패했습니다.');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-types-all'] });
      qc.invalidateQueries({ queryKey: ['task-types-active'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/task-types/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '삭제에 실패했습니다.');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-types-all'] });
      qc.invalidateQueries({ queryKey: ['task-types-active'] });
      setDeleteTarget(null);
      setDeleteError('');
      showToast('업무 유형이 삭제되었습니다.');
    },
    onError: (e: Error) => setDeleteError(e.message),
  });

  return (
    <div>

      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>불러오는 중...</div>
        ) : types.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>등록된 유형이 없습니다</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
                {['유형명', '정렬 순서', '상태', '관리'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.textMuted, textAlign: 'left', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.map(t => {
                return (
                  <tr key={t.id} style={{ borderTop: `1px solid ${C.border}`, background: t.isActive ? '#fff' : C.inactiveBg }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: t.isActive ? C.textPri : C.textMuted }}>{t.name}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: C.textSec, fontVariantNumeric: 'tabular-nums' }}>{t.sortOrder}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {t.isActive ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.success, background: C.successBg, borderRadius: 6, padding: '3px 8px' }}>● 활성</span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, background: C.pageBg, borderRadius: 6, padding: '3px 8px', border: `1px solid ${C.border}` }}>● 비활성</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => openEdit(t)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>
                        수정
                      </button>
                      <button type="button" onClick={() => toggleMutation.mutate(t)}
                        disabled={toggleMutation.isPending}
                        style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: t.isActive ? C.textSec : C.primary, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {t.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button type="button"
                        onClick={() => { setDeleteTarget(t); setDeleteError(''); }}
                        style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: C.danger, cursor: 'pointer', fontFamily: 'inherit' }}>
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 추가/수정 모달 */}
      {showForm && createPortal(
        <div onClick={() => setShowForm(false)}
          style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 420, background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)', padding: '24px 24px 20px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPri, marginBottom: 18 }}>
              {editing ? '업무 유형 수정' : '업무 유형 추가'}
            </h2>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6 }}>유형명</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                autoFocus placeholder="예: 승강기"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.pageBg, fontSize: 14, color: C.textPri, outline: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6 }}>정렬 순서</label>
              <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.pageBg, fontSize: 14, color: C.textPri, outline: 'none', fontFamily: 'inherit' }} />
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>작은 값이 먼저 표시됩니다.</div>
            </div>

            {formError && (
              <p style={{ fontSize: 12, color: C.danger, fontWeight: 600, marginBottom: 12, padding: '8px 12px', background: C.dangerBg, borderRadius: 8 }}>{formError}</p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 14, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>
                취소
              </button>
              <button type="button" onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: saveMutation.isPending ? 'oklch(75% 0.08 195)' : C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: saveMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {saveMutation.isPending ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 삭제 확인 */}
      {deleteTarget && createPortal(
        <div onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
          style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 380, background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)', padding: '24px 24px 20px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.textPri, marginBottom: 8 }}>업무 유형을 삭제하시겠습니까?</p>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
              <span style={{ fontWeight: 600, color: C.textPri }}>&quot;{deleteTarget.name}&quot;</span>이(가) 영구 삭제됩니다.
              사용 중인 유형은 삭제할 수 없습니다.
            </p>
            {deleteError && (
              <p style={{ fontSize: 12, color: C.danger, fontWeight: 600, marginBottom: 12, padding: '8px 12px', background: C.dangerBg, borderRadius: 8, lineHeight: 1.5 }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 14, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>
                취소
              </button>
              <button type="button" onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                style={{ flex: 1, padding: '11px', borderRadius: 8, border: 'none', background: deleteMutation.isPending ? 'oklch(75% 0.08 25)' : C.danger, color: '#fff', fontSize: 14, fontWeight: 700, cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {toast && createPortal(
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'oklch(18% 0.01 260)', color: '#fff', padding: '16px 28px', borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 500, boxShadow: '0 8px 32px oklch(0% 0 0 / 30%)', display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(62% 0.15 160)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {toast}
        </div>,
        document.body
      )}
    </div>
  );
}
