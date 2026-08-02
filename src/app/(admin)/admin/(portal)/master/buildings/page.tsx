'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MasterHeaderContext } from '../layout';
import { BUILDING_TYPE_OPTIONS, type BuildingType } from '@/types';

const C = {
  primary:    'oklch(55% 0.14 195)', primaryBg: 'oklch(93% 0.06 195)',
  danger:     'oklch(62% 0.16 25)',  dangerBg:  'oklch(95% 0.04 25)',
  success:    'oklch(62% 0.15 160)', successBg: 'oklch(93% 0.05 160)',
  border:     'oklch(88% 0.008 240)', pageBg:    'oklch(95% 0.005 220)',
  inactiveBg: 'oklch(96% 0.003 240)',
  textPri:    'oklch(18% 0.01 260)', textSec: 'oklch(50% 0.01 260)',
  textMuted:  'oklch(65% 0.01 260)',
};

interface BuildingRow {
  id:            string;
  name:          string;
  buildingTypes: BuildingType[];
  address:       string | null;
  builtAt:       string | null;
  approvedAt:    string | null;
  thumbnailPath: string | null;
  thumbnailUrl:  string | null;
  sortOrder:     number;
  isActive:      boolean;
  createdAt:     string;
}

export default function BuildingsPage() {
  const qc = useQueryClient();
  const { data: buildings = [], isLoading } = useQuery<BuildingRow[]>({
    queryKey: ['buildings-all'],
    queryFn: async () => {
      const res = await fetch('/api/admin/buildings');
      if (!res.ok) throw new Error('fetch error');
      return res.json();
    },
    staleTime: 0,
  });

  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState<BuildingRow | null>(null);
  const [name, setName]                 = useState('');
  const [types, setTypes]               = useState<Set<BuildingType>>(new Set());
  const [address, setAddress]           = useState('');
  const [builtAt, setBuiltAt]           = useState('');
  const [approvedAt, setApprovedAt]     = useState('');
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl]   = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [sortOrder, setSortOrder]       = useState<number>(0);
  const [formError, setFormError]       = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BuildingRow | null>(null);
  const [deleteError, setDeleteError]   = useState('');
  const [toast, setToast]               = useState('');
  const thumbInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 1600);
  }

  function resetForm() {
    setName('');
    setTypes(new Set());
    setAddress('');
    setBuiltAt('');
    setApprovedAt('');
    setThumbnailPath(null);
    setThumbnailUrl(null);
    setFormError('');
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setSortOrder((buildings[buildings.length - 1]?.sortOrder ?? 0) + 10);
    setShowForm(true);
  }

  function openEdit(b: BuildingRow) {
    setEditing(b);
    setName(b.name);
    setTypes(new Set(b.buildingTypes ?? []));
    setAddress(b.address ?? '');
    setBuiltAt(b.builtAt ?? '');
    setApprovedAt(b.approvedAt ?? '');
    setThumbnailPath(b.thumbnailPath);
    setThumbnailUrl(b.thumbnailUrl);
    setSortOrder(b.sortOrder);
    setFormError('');
    setShowForm(true);
  }

  function toggleType(t: BuildingType) {
    setTypes(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }

  async function handleThumbnailFile(file: File | null) {
    if (!file) return;
    setUploadingThumb(true);
    setFormError('');
    try {
      const fd = new FormData();
      fd.append('image', file, file.name);
      const res = await fetch('/api/admin/building-thumbnails', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? '썸네일 업로드에 실패했습니다.');
      }
      const j = await res.json();
      setThumbnailPath(j.path);
      setThumbnailUrl(j.url);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setUploadingThumb(false);
      if (thumbInputRef.current) thumbInputRef.current.value = '';
    }
  }

  /* 헤더 우측에 "새 건물 추가" 버튼 등록 */
  const { setAction } = useContext(MasterHeaderContext);
  useEffect(() => {
    setAction(
      <button type="button" onClick={openCreate}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(55% 0.14 195 / 30%)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        새 건물 추가
      </button>
    );
    return () => setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('건물명을 입력해주세요.');
      if (types.size === 0) throw new Error('건물 구분을 하나 이상 선택해주세요.');
      const url    = editing ? `/api/admin/buildings/${editing.id}` : '/api/admin/buildings';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          trimmed,
          buildingTypes: [...types],
          address:       address.trim() || null,
          builtAt:       builtAt        || null,
          approvedAt:    approvedAt     || null,
          thumbnailPath,
          sortOrder,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '저장에 실패했습니다.');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings-all'] });
      qc.invalidateQueries({ queryKey: ['buildings-active'] });
      setShowForm(false);
      showToast(editing ? '건물이 수정되었습니다.' : '건물이 추가되었습니다.');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (b: BuildingRow) => {
      const res = await fetch(`/api/admin/buildings/${b.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '변경에 실패했습니다.');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings-all'] });
      qc.invalidateQueries({ queryKey: ['buildings-active'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/buildings/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? '삭제에 실패했습니다.');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings-all'] });
      qc.invalidateQueries({ queryKey: ['buildings-active'] });
      setDeleteTarget(null);
      setDeleteError('');
      showToast('건물이 삭제되었습니다.');
    },
    onError: (e: Error) => setDeleteError(e.message),
  });

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>불러오는 중...</div>
        ) : buildings.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>등록된 건물이 없습니다</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
                {['', '건물명', '구분', '주소', '정렬 순서', '상태', '관리'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: C.textMuted, textAlign: 'left', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {buildings.map(b => (
                <tr key={b.id} style={{ borderTop: `1px solid ${C.border}`, background: b.isActive ? '#fff' : C.inactiveBg }}>
                  {/* 썸네일 */}
                  <td style={{ padding: '10px 16px', width: 60 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: C.pageBg, border: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {b.thumbnailUrl ? (
                        <img src={b.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: b.isActive ? C.textPri : C.textMuted }}>{b.name}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {b.buildingTypes.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {b.buildingTypes.map(t => (
                          <span key={t} style={{ fontSize: 11, fontWeight: 600, color: C.textSec, background: C.pageBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '2px 7px' }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: C.textMuted }}>미지정</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: C.textSec, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {b.address || <span style={{ color: C.textMuted }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: C.textSec, fontVariantNumeric: 'tabular-nums' }}>{b.sortOrder}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {b.isActive ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.success, background: C.successBg, borderRadius: 6, padding: '3px 8px' }}>● 활성</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, background: C.pageBg, borderRadius: 6, padding: '3px 8px', border: `1px solid ${C.border}` }}>● 비활성</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => openEdit(b)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>
                        수정
                      </button>
                      <button type="button" onClick={() => toggleMutation.mutate(b)}
                        disabled={toggleMutation.isPending}
                        style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: b.isActive ? C.textSec : C.primary, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {b.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button type="button"
                        onClick={() => { setDeleteTarget(b); setDeleteError(''); }}
                        style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: C.danger, cursor: 'pointer', fontFamily: 'inherit' }}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 추가/수정 모달 ─────────────────────── */}
      {showForm && createPortal(
        <div onClick={() => setShowForm(false)}
          style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 560, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)', padding: '24px 24px 20px' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPri, marginBottom: 18 }}>
              {editing ? '건물 수정' : '새 건물 추가'}
            </h2>

            {/* 건물명 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6 }}>
                건물명 <span style={{ color: C.danger }}>*</span>
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                autoFocus
                placeholder="예: 영준빌딩"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.pageBg, fontSize: 14, color: C.textPri, outline: 'none', fontFamily: 'inherit' }} />
            </div>

            {/* 건물 구분 (다중 선택) */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6 }}>
                건물 구분 <span style={{ color: C.danger }}>*</span> <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>(복수 선택 가능)</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {BUILDING_TYPE_OPTIONS.map(t => {
                  const active = types.has(t);
                  return (
                    <button key={t} type="button" onClick={() => toggleType(t)}
                      style={{
                        padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${active ? C.primary : C.border}`,
                        background: active ? C.primaryBg : C.pageBg,
                        fontSize: 12, fontWeight: 600, color: active ? C.primary : C.textPri,
                        fontFamily: 'inherit', transition: '150ms ease',
                      }}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 주소 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6 }}>건물 주소</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="예: 서울특별시 강남구 테헤란로 123"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.pageBg, fontSize: 14, color: C.textPri, outline: 'none', fontFamily: 'inherit' }} />
            </div>

            {/* 건축일 / 사용승인일 */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6 }}>건축일</label>
                <input type="date" value={builtAt} onChange={e => setBuiltAt(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.pageBg, fontSize: 14, color: C.textPri, outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6 }}>사용승인일</label>
                <input type="date" value={approvedAt} onChange={e => setApprovedAt(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.pageBg, fontSize: 14, color: C.textPri, outline: 'none', fontFamily: 'inherit' }} />
              </div>
            </div>

            {/* 썸네일 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6 }}>썸네일 사진</label>
              <input ref={thumbInputRef} type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                style={{ display: 'none' }}
                onChange={e => handleThumbnailFile(e.target.files?.[0] ?? null)} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 88, height: 88, borderRadius: 8, background: C.pageBg, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button type="button" onClick={() => thumbInputRef.current?.click()}
                    disabled={uploadingThumb}
                    style={{ padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 12, fontWeight: 600, color: C.textSec, cursor: uploadingThumb ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {uploadingThumb ? '업로드 중...' : (thumbnailUrl ? '다른 사진 선택' : '사진 선택')}
                  </button>
                  {thumbnailUrl && (
                    <button type="button" onClick={() => { setThumbnailPath(null); setThumbnailUrl(null); }}
                      style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'transparent', fontSize: 11, fontWeight: 600, color: C.danger, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      사진 제거
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 정렬 순서 */}
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

      {/* ── 삭제 확인 ─────────────────────────── */}
      {deleteTarget && createPortal(
        <div onClick={() => { setDeleteTarget(null); setDeleteError(''); }}
          style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: 380, background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)', padding: '24px 24px 20px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.textPri, marginBottom: 8 }}>건물을 삭제하시겠습니까?</p>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>
              <span style={{ fontWeight: 600, color: C.textPri }}>&quot;{deleteTarget.name}&quot;</span>이(가) 영구 삭제됩니다.
              사용 중인 건물은 삭제할 수 없습니다.
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
