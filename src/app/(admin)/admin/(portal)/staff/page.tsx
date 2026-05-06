'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/* ── 삭제 대상 타입 ──────────────────────────────────────────── */
interface DeleteTarget {
  id:        string;
  type:      'staff' | 'admin';
  name:      string;
  taskCount: number;
}

/* ── 색상 ─────────────────────────────────────────────────────── */
const C = {
  primary:    'oklch(55% 0.14 195)', primaryBg: 'oklch(93% 0.06 195)',
  danger:     'oklch(62% 0.16 25)',  dangerBg:  'oklch(95% 0.04 25)',
  success:    'oklch(62% 0.15 160)', successBg: 'oklch(93% 0.05 160)',
  warning:    'oklch(65% 0.16 65)',
  border:     'oklch(88% 0.008 240)', pageBg: 'oklch(95% 0.005 220)',
  inactiveBg: 'oklch(96% 0.003 240)',
  textPri:    'oklch(18% 0.01 260)', textSec: 'oklch(50% 0.01 260)',
  textMuted:  'oklch(65% 0.01 260)',
};

const DEPT_COLOR: Record<string, string> = {
  보안: 'oklch(65% 0.16 65)', 청소: 'oklch(62% 0.15 160)', 시설: 'oklch(55% 0.14 195)',
};

const JOB_TYPE_LABEL: Record<string, string> = {
  security: '보안', cleaning: '청소', maintenance: '시설',
};
const JOB_TYPE_FROM_LABEL: Record<string, string> = {
  보안: 'security', 청소: 'cleaning', 시설유지보수: 'maintenance',
};

const DEPT_LABELS = ['보안', '청소', '시설유지보수'] as const;

/* ── API 타입 ────────────────────────────────────────────────── */
interface StaffRow {
  id: string; name: string; jobTypes: string[]; depts: string[];
  isActive: boolean; phone: string; loginId: string; joinedAt: string;
}
interface AdminRow {
  id: string; name: string; role: 'super' | 'admin'; phone: string; is_active: boolean;
}
interface ModalErrors { name?: string; loginId?: string; pw?: string; }

/* ── 필터 드롭다운 ────────────────────────────────────────────── */
function FilterSelect({ value, onChange, options, minWidth = 120 }: {
  value: string; onChange: (v: string) => void; options: string[]; minWidth?: number;
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select className="admin-select" value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: '8px 32px 8px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', color: C.textPri, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minWidth, outline: 'none' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', right: 10, pointerEvents: 'none' }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

/* ── 삭제 경고 다이얼로그 ─────────────────────────────────────── */
function DeleteWarningDialog({
  target, onClose, onConfirm, loading, error,
}: {
  target:    DeleteTarget;
  onClose:   () => void;
  onConfirm: () => void;
  loading:   boolean;
  error:     string;
}) {
  const isStaff = target.type === 'staff';

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, animation: 'fadeIn 0.2s ease', padding: 24 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 16, overflow: 'hidden', animation: 'scaleIn 0.22s cubic-bezier(0.34,1.2,0.64,1)', boxShadow: '0 20px 60px oklch(0% 0 0 / 30%)' }}
      >
        {/* 본문 */}
        <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
          {/* 위험 아이콘 */}
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'oklch(95% 0.04 25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="oklch(62% 0.16 25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          {/* 제목 */}
          <div style={{ fontSize: 18, fontWeight: 700, color: 'oklch(18% 0.01 260)', marginBottom: 8 }}>
            {target.name}님을 삭제하시겠습니까?
          </div>

          {/* 연관 업무 경고 */}
          <div style={{ background: 'oklch(95% 0.04 25)', border: '1px solid oklch(88% 0.06 25)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'oklch(62% 0.16 25)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              연관 데이터 삭제 경고
            </div>
            {isStaff ? (
              <div style={{ fontSize: 13, color: 'oklch(40% 0.08 25)', lineHeight: 1.6 }}>
                이 직원에게 배정된 <strong>업무 {target.taskCount}건</strong>과 해당 업무의
                완료 보고가 <strong>모두 함께 삭제</strong>됩니다.
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'oklch(40% 0.08 25)', lineHeight: 1.6 }}>
                이 관리자가 생성한 <strong>업무 {target.taskCount}건</strong>의
                생성자 정보가 초기화됩니다. 업무 자체는 유지됩니다.
              </div>
            )}
          </div>

          {/* 되돌릴 수 없음 */}
          <div style={{ fontSize: 12, color: 'oklch(50% 0.01 260)', lineHeight: 1.6 }}>
            이 작업은 <strong>되돌릴 수 없습니다.</strong><br />
            삭제를 진행하기 전에 다시 한 번 확인해주세요.
          </div>

          {/* API 에러 */}
          {error && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'oklch(95% 0.04 25)', borderRadius: 8, fontSize: 12, color: 'oklch(62% 0.16 25)', fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>

        {/* 버튼 행 */}
        <div style={{ display: 'flex', borderTop: '1px solid oklch(88% 0.008 240)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1, padding: '15px', border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, color: 'oklch(50% 0.01 260)', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', borderRight: '1px solid oklch(88% 0.008 240)' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, padding: '15px', border: 'none', background: 'transparent', fontSize: 15, fontWeight: 700, color: 'oklch(62% 0.16 25)', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '삭제 중...' : '삭제하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 관리자 수정 모달 ────────────────────────────────────────── */
function AdminEditModal({ target, onClose, onSave }: {
  target: AdminRow;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name,        setName]        = useState(target.name);
  const [phone,       setPhone]       = useState(target.phone ?? '');
  const [loginId,     setLoginId]     = useState('');
  const [curPw,       setCurPw]       = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [err,         setErr]         = useState('');
  const [saving,      setSaving]      = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: `1.5px solid ${C.border}`, background: C.pageBg,
    color: C.textPri, outline: 'none', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: C.textPri, display: 'block', marginBottom: 6,
  };

  async function handleSave() {
    if (!name.trim()) return setErr('이름을 입력해주세요.');
    if (newPw && newPw.length < 6) return setErr('새 비밀번호는 6자 이상이어야 합니다.');
    if (newPw && newPw !== confirmPw) return setErr('새 비밀번호가 일치하지 않습니다.');
    if (newPw && !curPw) return setErr('현재 비밀번호를 입력해주세요.');

    setSaving(true);
    try {
      const body: Record<string, string> = { name: name.trim(), phone: phone.trim() };
      if (loginId.trim()) body.loginId = loginId.trim();
      if (newPw)          { body.currentPassword = curPw; body.newPassword = newPw; }

      const res = await fetch(`/api/admin/admins/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return setErr(data.error ?? '수정에 실패했습니다.');
      onSave();
    } catch {
      setErr('네트워크 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPri }}>관리자 정보 수정</h2>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{target.name} 계정 정보를 수정합니다</p>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* 기본 정보 */}
          <div>
            <label style={labelStyle}>이름 *</label>
            <input value={name} onChange={e => { setName(e.target.value); setErr(''); }} style={inputStyle} placeholder="이름" />
          </div>
          <div>
            <label style={labelStyle}>연락처</label>
            <input value={phone} onChange={e => { setPhone(e.target.value); setErr(''); }} style={inputStyle} placeholder="010-0000-0000" />
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>아이디 / 비밀번호 변경 (변경하지 않으려면 비워두세요)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>새 아이디</label>
                <input value={loginId} onChange={e => { setLoginId(e.target.value); setErr(''); }} style={inputStyle} placeholder="변경할 아이디 입력" autoComplete="off" />
              </div>
              <div>
                <label style={labelStyle}>현재 비밀번호</label>
                <input type="password" value={curPw} onChange={e => { setCurPw(e.target.value); setErr(''); }} style={inputStyle} placeholder="현재 비밀번호" autoComplete="current-password" />
              </div>
              <div>
                <label style={labelStyle}>새 비밀번호</label>
                <input type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setErr(''); }} style={inputStyle} placeholder="6자 이상" autoComplete="new-password" />
              </div>
              <div>
                <label style={labelStyle}>새 비밀번호 확인</label>
                <input type="password" value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setErr(''); }} style={inputStyle} placeholder="다시 한 번 입력" autoComplete="new-password" />
              </div>
            </div>
          </div>

          {err && <p style={{ fontSize: 12, color: C.danger, fontWeight: 600 }}>{err}</p>}
        </div>
        <div style={{ padding: '0 24px 20px', display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 13, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ flex: 1.4, padding: '10px', borderRadius: 8, border: 'none', background: saving ? 'oklch(75% 0.08 195)' : C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(55% 0.14 195 / 30%)' }}>
            {saving ? '저장 중...' : '수정 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 직원 추가/수정 모달 ─────────────────────────────────────── */
function StaffModal({ mode, initial, onClose, onSave }: {
  mode: 'add' | 'edit';
  initial?: Partial<StaffRow & { password?: string }>;
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = mode === 'edit';
  const [name,    setName]    = useState(initial?.name    ?? '');
  const [depts,   setDepts]   = useState<Set<string>>(
    new Set(initial?.jobTypes?.map(jt => DEPT_LABELS.find(d => JOB_TYPE_FROM_LABEL[d] === jt) ?? '') ?? ['보안'])
  );
  const [phone,   setPhone]   = useState(initial?.phone   ?? '');
  const [loginId, setLoginId] = useState(initial?.loginId ?? '');
  const [pw,      setPw]      = useState('');
  const [errors,  setErrors]  = useState<ModalErrors>({});
  const [saving,  setSaving]  = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  function inputStyle(fieldName: string, errKey?: keyof ModalErrors): React.CSSProperties {
    const err = errKey ? errors[errKey] : undefined;
    const isFoc = focused === fieldName;
    return { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${err ? C.danger : isFoc ? C.primary : C.border}`, background: isFoc ? '#fff' : C.pageBg, fontSize: 14, color: C.textPri, outline: 'none', fontFamily: 'inherit', transition: '150ms ease' };
  }

  function toggleDept(label: string) {
    setDepts(prev => {
      const next = new Set(prev);
      if (next.has(label) && next.size > 1) next.delete(label); // 최소 1개 유지
      else next.add(label);
      return next;
    });
  }

  async function handleSave() {
    const e: ModalErrors = {};
    if (!name.trim())    e.name    = '이름을 입력해주세요';
    if (!loginId.trim()) e.loginId = '아이디를 입력해주세요';
    if (!isEdit && !pw)  e.pw      = '임시 비밀번호를 입력해주세요';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSaving(true);
    const jobTypes = [...depts].map(d => JOB_TYPE_FROM_LABEL[d]).filter(Boolean);

    const url    = isEdit ? `/api/admin/staff/${initial?.id}` : '/api/admin/staff';
    const method = isEdit ? 'PATCH' : 'POST';
    const body   = isEdit
      ? { name, jobTypes, phone, loginId, ...(pw ? { password: pw } : {}) }
      : { name, jobTypes, phone, loginId, password: pw };

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json();
        setErrors({ loginId: d.error });
        return;
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'oklch(0% 0 0 / 45%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'fadeIn 0.2s ease', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 480, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px oklch(0% 0 0 / 25%)', animation: 'scaleIn 0.25s cubic-bezier(0.34,1.2,0.64,1)' }}>
        {/* 헤더 */}
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPri }}>{isEdit ? '직원 정보 수정' : '새 직원 추가'}</h2>
            <p style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{isEdit ? '직원 정보를 수정합니다' : '신규 직원을 등록하고 로그인 계정을 발급합니다'}</p>
          </div>
          <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* 폼 */}
        <div style={{ padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>이름 <span style={{ color: C.danger }}>*</span></label>
            <input value={name} onChange={e => { setName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: undefined })); }} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} placeholder="홍길동" style={inputStyle('name', 'name')} />
            {errors.name && <div style={{ fontSize: 12, color: C.danger, fontWeight: 600, marginTop: 5 }}>{errors.name}</div>}
          </div>

          {/* 직군 — 복수 선택 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>직군 <span style={{ color: C.danger }}>*</span> <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>(복수 선택 가능)</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {DEPT_LABELS.map(label => {
                const active = depts.has(label);
                return (
                  <button key={label} type="button" onClick={() => toggleDept(label)}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: `1.5px solid ${active ? C.primary : C.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: active ? C.primaryBg : C.pageBg, color: active ? C.primary : C.textSec, transition: '150ms ease' }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6, display: 'block' }}>연락처</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} placeholder="010-0000-0000" style={inputStyle('phone')} />
          </div>

          <div style={{ height: 1, background: C.border, margin: '20px 0' }} />

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>아이디 (로그인용) <span style={{ color: C.danger }}>*</span></label>
            <input value={loginId} onChange={e => { setLoginId(e.target.value); if (errors.loginId) setErrors(p => ({ ...p, loginId: undefined })); }} onFocus={() => setFocused('loginId')} onBlur={() => setFocused(null)} placeholder="영문/숫자 4자 이상" style={inputStyle('loginId', 'loginId')} />
            {errors.loginId && <div style={{ fontSize: 12, color: C.danger, fontWeight: 600, marginTop: 5 }}>{errors.loginId}</div>}
          </div>

          {!isEdit ? (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>임시 비밀번호 <span style={{ color: C.danger }}>*</span></label>
              <input type="text" value={pw} onChange={e => { setPw(e.target.value); if (errors.pw) setErrors(p => ({ ...p, pw: undefined })); }} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} placeholder="초기 발급용 비밀번호" style={inputStyle('pw', 'pw')} />
              {errors.pw && <div style={{ fontSize: 12, color: C.danger, fontWeight: 600, marginTop: 5 }}>{errors.pw}</div>}
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>직원이 첫 로그인 시 비밀번호 변경을 안내합니다</div>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.textPri, marginBottom: 6, display: 'block' }}>비밀번호 변경 (선택)</label>
              <input type="text" value={pw} onChange={e => setPw(e.target.value)} onFocus={() => setFocused('pw')} onBlur={() => setFocused(null)} placeholder="변경할 비밀번호 (비워두면 유지)" style={inputStyle('pw')} />
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div style={{ padding: '14px 22px', borderTop: `1px solid ${C.border}`, background: C.pageBg, borderRadius: '0 0 14px 14px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 22px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: '#fff', fontSize: 13, fontWeight: 600, color: C.textSec, cursor: 'pointer', fontFamily: 'inherit' }}>취소</button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ padding: '10px 26px', borderRadius: 8, border: 'none', background: saving ? 'oklch(75% 0.08 195)' : C.primary, color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(55% 0.14 195 / 30%)' }}>
            {saving ? '저장 중...' : isEdit ? '수정 저장' : '직원 추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────── */
export default function StaffPage() {
  const queryClient = useQueryClient();
  const [tab,        setTab]        = useState<'staff' | 'admin'>('staff');
  const [search,     setSearch]     = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [deptFilter, setDeptFilter] = useState('전체');
  const [statFilter, setStatFilter] = useState('전체');
  const [modal,          setModal]          = useState<{ mode: 'add' | 'edit'; initial?: Partial<StaffRow> } | null>(null);
  const [adminEditTarget, setAdminEditTarget] = useState<AdminRow | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<DeleteTarget | null>(null);
  const [fetchingDelete, setFetchingDelete] = useState(false);
  const [deleteError,    setDeleteError]    = useState('');

  /* ── 현재 로그인 사용자 (슈퍼어드민 여부 확인) ── */
  const { data: me } = useQuery({
    queryKey: ['me'], queryFn: () => fetch('/api/auth/me').then(r => r.json()), staleTime: Infinity,
  });
  const isSuper = me?.adminRole === 'super';

  /* ── 직원 목록 ── */
  const { data: staffList = [], isLoading: staffLoading } = useQuery<StaffRow[]>({
    queryKey: ['staff-all'],
    queryFn: () => fetch('/api/admin/staff?all=true').then(r => r.json()),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  /* ── 관리자 목록 ── */
  const { data: adminList = [] } = useQuery<AdminRow[]>({
    queryKey: ['admin-list'],
    queryFn: () => fetch('/api/admin/admins').then(r => r.json()),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  /* ── 삭제 다이얼로그 열기 (업무 수 미리 조회) ── */
  async function openDeleteDialog(id: string, type: 'staff' | 'admin', name: string) {
    setFetchingDelete(true);
    setDeleteError('');
    try {
      const endpoint = type === 'staff' ? `/api/admin/staff/${id}` : `/api/admin/admins/${id}`;
      const res  = await fetch(endpoint);
      const data = await res.json();
      setDeleteTarget({ id, type, name, taskCount: data.taskCount ?? 0 });
    } catch {
      setDeleteTarget({ id, type, name, taskCount: 0 });
    } finally {
      setFetchingDelete(false);
    }
  }

  /* ── 삭제 실행 뮤테이션 ── */
  const executeDeletion = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'staff' | 'admin' }) => {
      const url = type === 'staff' ? `/api/admin/staff/${id}` : `/api/admin/admins/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? '삭제에 실패했습니다.');
      }
    },
    onSuccess: (_, { type }) => {
      // 인력 목록 갱신
      queryClient.invalidateQueries({ queryKey: [type === 'staff' ? 'staff-all' : 'admin-list'] });
      // 직원 삭제 시 연관 업무도 삭제됐으므로 업무 목록 캐시도 무효화
      if (type === 'staff') {
        queryClient.invalidateQueries({ queryKey: ['admin-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
      setDeleteTarget(null);
      setDeleteError('');
    },
    onError: (err: Error) => {
      setDeleteError(err.message);
    },
  });

  /* ── 비활성/활성 토글 ── */
  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/admin/staff/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-all'] }),
  });

  /* ── 필터 ── */
  const JOB_MAP: Record<string, string> = { 보안: 'security', 청소: 'cleaning', 시설유지보수: 'maintenance' };
  const filteredStaff = staffList.filter(s => {
    if (search && !isComposing && !s.name.includes(search)) return false;
    if (deptFilter !== '전체' && !s.jobTypes.includes(JOB_MAP[deptFilter])) return false;
    if (statFilter === '활성'   && !s.isActive) return false;
    if (statFilter === '비활성' && s.isActive)  return false;
    return true;
  });

  const TABS = [
    { key: 'staff', label: '현장 직원', count: staffList.length },
    { key: 'admin', label: '관리자',    count: adminList.length },
  ] as const;

  return (
    <div className="admin-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPri }}>인력 관리</h1>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 3 }}>직원 및 관리자 계정을 관리하세요</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => setModal({ mode: 'add' })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, border: 'none', background: C.primary, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px oklch(55% 0.14 195 / 30%)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            새 직원 추가
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
        {TABS.map(t => {
          const isActive = tab === t.key;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: isActive ? 700 : 400, color: isActive ? C.primary : C.textSec, borderBottom: `2px solid ${isActive ? C.primary : 'transparent'}`, display: 'flex', alignItems: 'center', gap: 6, marginBottom: -1 }}>
              {t.label}
              <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 10, padding: '1px 7px', background: isActive ? C.primary : C.border, color: isActive ? '#fff' : C.textSec }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* ── 현장 직원 탭 ── */}
      {tab === 'staff' && (
        <>
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 16px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={e => { setIsComposing(false); setSearch((e.target as HTMLInputElement).value); }}
                onFocus={e => (e.target.style.borderColor = C.primary)}
                onBlur={e  => (e.target.style.borderColor = C.border)}
                placeholder="이름으로 검색"
                style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.textPri, outline: 'none', fontFamily: 'inherit', background: C.pageBg }} />
            </div>
            <FilterSelect value={deptFilter} onChange={setDeptFilter} options={['전체', '보안', '청소', '시설유지보수']} minWidth={130} />
            <FilterSelect value={statFilter} onChange={setStatFilter} options={['전체', '활성', '비활성']} minWidth={110} />
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {staffLoading ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>불러오는 중...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
                    {['이름', '직군', '연락처', '계정 상태', '액션'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: C.textMuted, textAlign: 'left', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>검색 결과가 없습니다</td></tr>
                  ) : filteredStaff.map(s => {
                    return (
                      <tr key={s.id} style={{ borderTop: `1px solid ${C.border}`, background: s.isActive ? 'transparent' : C.inactiveBg, opacity: s.isActive ? 1 : 0.65 }}
                        onMouseEnter={e => { if (s.isActive) e.currentTarget.style.background = C.pageBg; }}
                        onMouseLeave={e => { if (s.isActive) e.currentTarget.style.background = 'transparent'; }}>
                        {/* 이름 */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.isActive ? `${(DEPT_COLOR[s.depts[0]] ?? C.primary)}18` : C.inactiveBg, border: `1.5px solid ${s.isActive ? (DEPT_COLOR[s.depts[0]] ?? C.primary) : C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: s.isActive ? (DEPT_COLOR[s.depts[0]] ?? C.primary) : C.textMuted, flexShrink: 0 }}>
                              {s.name[0]}
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: s.isActive ? C.textPri : C.textMuted }}>{s.name}</span>
                          </div>
                        </td>
                        {/* 직군 (복수) */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {s.jobTypes.map(jt => {
                              const label = JOB_TYPE_LABEL[jt] ?? jt;
                              const dc    = DEPT_COLOR[label] ?? C.textMuted;
                              return (
                                <span key={jt} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: s.isActive ? dc : C.textMuted, background: s.isActive ? `${dc}18` : C.inactiveBg, borderRadius: 6, padding: '2px 7px' }}>
                                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.isActive ? dc : C.textMuted }} />{label}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        {/* 연락처 */}
                        <td style={{ padding: '12px 16px', fontSize: 13, color: s.isActive ? C.textSec : C.textMuted }}>{s.phone || '—'}</td>
                        {/* 계정 상태 */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '3px 8px', color: s.isActive ? C.success : C.textMuted, background: s.isActive ? C.successBg : C.inactiveBg, border: s.isActive ? 'none' : `1px solid ${C.border}` }}>
                            {s.isActive ? '● 활성' : '○ 비활성'}
                          </span>
                        </td>
                        {/* 액션 */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {s.isActive ? (
                              <>
                                <button type="button" className="staff-btn staff-btn-edit" onClick={() => setModal({ mode: 'edit', initial: s })}>수정</button>
                                <button type="button" className="staff-btn staff-btn-deactivate" onClick={() => toggleActive.mutate({ id: s.id, isActive: false })}>비활성화</button>
                              </>
                            ) : (
                              <button type="button" className="staff-btn staff-btn-activate" onClick={() => toggleActive.mutate({ id: s.id, isActive: true })}>활성화</button>
                            )}
                            {isSuper && (
                              <button type="button" className="staff-btn staff-btn-deactivate"
                                disabled={fetchingDelete}
                                onClick={() => openDeleteDialog(s.id, 'staff', s.name)}>
                                {fetchingDelete ? '...' : '삭제'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── 관리자 탭 ── */}
      {tab === 'admin' && (
        <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
                {['이름', '권한', '연락처', '계정 상태', '액션'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: C.textMuted, textAlign: 'left', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {adminList.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px 16px', textAlign: 'center', color: C.textMuted, fontSize: 14 }}>불러오는 중...</td></tr>
              ) : adminList.map(a => (
                  <tr key={a.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.primaryBg, border: `1.5px solid ${C.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.primary, flexShrink: 0 }}>{a.name[0]}</div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.textPri }}>{a.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: a.role === 'super' ? C.warning : C.primary, background: a.role === 'super' ? 'oklch(95% 0.05 85)' : C.primaryBg, borderRadius: 6, padding: '3px 8px' }}>
                        {a.role === 'super' ? '슈퍼 관리자' : '관리자'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: C.textSec }}>{a.phone || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.success, background: C.successBg, borderRadius: 6, padding: '3px 8px' }}>● 활성</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(a.id === me?.id || isSuper) && (
                          <button type="button" className="staff-btn staff-btn-edit"
                            onClick={() => setAdminEditTarget(a)}>
                            수정
                          </button>
                        )}
                        {isSuper && a.role !== 'super' && (
                          <button type="button" className="staff-btn staff-btn-deactivate"
                            disabled={fetchingDelete}
                            onClick={() => openDeleteDialog(a.id, 'admin', a.name)}>
                            {fetchingDelete ? '...' : '삭제'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 관리자 수정 모달 */}
      {adminEditTarget && (
        <AdminEditModal
          target={adminEditTarget}
          onClose={() => setAdminEditTarget(null)}
          onSave={() => {
            setAdminEditTarget(null);
            queryClient.invalidateQueries({ queryKey: ['admin-list'] });
          }}
        />
      )}

      {/* 직원 추가/수정 모달 */}
      {modal && (
        <StaffModal
          mode={modal.mode}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); queryClient.invalidateQueries({ queryKey: ['staff-all'] }); }}
        />
      )}

      {/* 삭제 경고 다이얼로그 */}
      {deleteTarget && (
        <DeleteWarningDialog
          target={deleteTarget}
          loading={executeDeletion.isPending}
          error={deleteError}
          onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
          onConfirm={() => executeDeletion.mutate({ id: deleteTarget.id, type: deleteTarget.type })}
        />
      )}
    </div>
  );
}
