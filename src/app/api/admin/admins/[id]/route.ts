/**
 * GET    /api/admin/admins/[id]  - 관리자 단건 + 연관 업무 수
 * DELETE /api/admin/admins/[id]  - 관리자 삭제 (슈퍼 관리자 전용)
 *
 * 삭제 순서:
 *   1. reports.reviewed_by_id = NULL  (이 관리자가 검토한 보고)
 *   2. tasks.created_by_id   = NULL  (이 관리자가 생성한 업무)
 *   3. admins 행 삭제
 *
 * ※ tasks.created_by_id 컬럼이 NOT NULL이면 step 2가 실패합니다.
 *    SQL Editor에서 실행: ALTER TABLE tasks ALTER COLUMN created_by_id DROP NOT NULL;
 */
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

async function requireSuper() {
  const s = await getSession();
  if (!s || s.role !== 'admin' || s.adminRole !== 'super') return null;
  return s;
}

/* ── GET ──────────────────────────────────────────────────── */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  const [adminRes, taskRes] = await Promise.all([
    supabaseAdmin.from('admins').select('id, name, role').eq('id', id).single(),
    supabaseAdmin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_id', id),
  ]);

  if (adminRes.error || !adminRes.data) {
    return NextResponse.json({ error: '관리자를 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ ...adminRes.data, taskCount: taskRes.count ?? 0 });
}

/* ── PATCH (본인 또는 슈퍼 관리자가 정보 수정) ─────────────── */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const isOwnAccount = session.id === id;
  const isSuperAdmin = session.adminRole === 'super';

  if (!isOwnAccount && !isSuperAdmin) {
    return NextResponse.json({ error: '본인 계정만 수정할 수 있습니다.' }, { status: 403 });
  }

  const { name, phone, loginId, currentPassword, newPassword } = await req.json() as {
    name?: string; phone?: string;
    loginId?: string;
    currentPassword?: string; newPassword?: string;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: '이름을 입력해주세요.' }, { status: 400 });
  }

  const updates: Record<string, string> = {
    name:     name.trim(),
    phone:    phone?.trim() ?? '',
  };

  // 아이디 변경
  if (loginId?.trim()) {
    const { data: existing } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('login_id', loginId.trim())
      .neq('id', id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 아이디입니다.' }, { status: 409 });
    }
    updates.login_id = loginId.trim();
  }

  // 비밀번호 변경
  if (newPassword) {
    if (newPassword.length < 6) {
      return NextResponse.json({ error: '새 비밀번호는 6자 이상이어야 합니다.' }, { status: 400 });
    }
    if (!currentPassword) {
      return NextResponse.json({ error: '현재 비밀번호를 입력해주세요.' }, { status: 400 });
    }
    const { data: admin } = await supabaseAdmin
      .from('admins')
      .select('password_hash')
      .eq('id', id)
      .single();
    const isValid = admin && await bcrypt.compare(currentPassword, admin.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }
    updates.password_hash = await bcrypt.hash(newPassword, 10);
  }

  const { error } = await supabaseAdmin
    .from('admins')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[PATCH admins]', error);
    return NextResponse.json({ error: '수정에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/* ── DELETE ───────────────────────────────────────────────── */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSuper();
  if (!session) {
    return NextResponse.json(
      { error: '슈퍼 관리자만 관리자를 삭제할 수 있습니다.' },
      { status: 403 },
    );
  }

  const { id } = await params;

  if (id === session.id) {
    return NextResponse.json({ error: '자신의 계정은 삭제할 수 없습니다.' }, { status: 400 });
  }

  // 1. 이 관리자가 검토한 보고의 reviewed_by_id → NULL
  const { error: rErr } = await supabaseAdmin
    .from('reports')
    .update({ reviewed_by_id: null })
    .eq('reviewed_by_id', id);

  if (rErr) {
    console.error('[DELETE admins] reports 초기화 실패:', rErr.message);
    return NextResponse.json(
      { error: '관련 보고 데이터 초기화 실패: ' + rErr.message },
      { status: 500 },
    );
  }

  // 2. 이 관리자가 생성한 업무의 created_by_id → NULL
  //    (tasks.created_by_id 컬럼이 nullable이어야 합니다)
  const { error: tErr } = await supabaseAdmin
    .from('tasks')
    .update({ created_by_id: null })
    .eq('created_by_id', id);

  if (tErr) {
    console.error('[DELETE admins] tasks 초기화 실패:', tErr.message);
    return NextResponse.json(
      { error: '관련 업무 데이터 초기화 실패: ' + tErr.message },
      { status: 500 },
    );
  }

  // 3. 관리자 삭제
  const { error: aErr } = await supabaseAdmin
    .from('admins')
    .delete()
    .eq('id', id);

  if (aErr) {
    console.error('[DELETE admins] 관리자 삭제 실패:', aErr.message);
    return NextResponse.json(
      { error: '삭제에 실패했습니다: ' + aErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
