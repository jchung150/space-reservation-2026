/**
 * GET    /api/admin/staff/[id]  - 직원 단건 + 연관 업무 수
 * PATCH  /api/admin/staff/[id]  - 직원 정보 수정
 * DELETE /api/admin/staff/[id]  - 직원 삭제 (슈퍼 관리자 전용)
 *
 * 삭제 순서:
 *   1. 이 직원의 업무에 달린 reports 삭제
 *   2. 이 직원에게 배정된 tasks 삭제
 *   3. staff 행 삭제
 */
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

async function requireAdmin() {
  const s = await getSession();
  return s?.role === 'admin' ? s : null;
}

/* ── GET ──────────────────────────────────────────────────── */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }
  const { id } = await params;

  const [staffRes, taskRes] = await Promise.all([
    supabaseAdmin.from('staff').select('id, name, job_types, is_active').eq('id', id).single(),
    supabaseAdmin
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', id)
      .eq('is_archived', false),
  ]);

  if (staffRes.error || !staffRes.data) {
    return NextResponse.json({ error: '직원을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({ ...staffRes.data, taskCount: taskRes.count ?? 0 });
}

/* ── PATCH ────────────────────────────────────────────────── */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as {
    name?: string; jobTypes?: string[]; phone?: string;
    loginId?: string; password?: string; isActive?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (body.name     !== undefined) update.name      = body.name;
  if (body.jobTypes !== undefined) update.job_types = body.jobTypes;
  if (body.phone    !== undefined) update.phone     = body.phone;
  if (body.loginId  !== undefined) update.login_id  = body.loginId;
  if (body.isActive !== undefined) update.is_active = body.isActive;
  if (body.password)               update.password_hash = await bcrypt.hash(body.password, 10);

  const { data, error } = await supabaseAdmin
    .from('staff').update(update).eq('id', id)
    .select('id, name, job_types, is_active, phone, login_id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/* ── DELETE ───────────────────────────────────────────────── */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  if (session.adminRole !== 'super') {
    return NextResponse.json(
      { error: '슈퍼 관리자만 직원을 삭제할 수 있습니다.' },
      { status: 403 },
    );
  }

  const { id } = await params;

  // 1. 이 직원에게 배정된 업무 ID 목록 조회
  const { data: tasks, error: fetchErr } = await supabaseAdmin
    .from('tasks')
    .select('id')
    .eq('assignee_id', id);

  if (fetchErr) {
    return NextResponse.json({ error: '업무 조회 실패: ' + fetchErr.message }, { status: 500 });
  }

  // 2. 각 업무의 보고(reports) 삭제
  if (tasks && tasks.length > 0) {
    const taskIds = tasks.map(t => t.id);

    const { error: rErr } = await supabaseAdmin
      .from('reports')
      .delete()
      .in('task_id', taskIds);

    if (rErr) {
      return NextResponse.json({ error: '보고 삭제 실패: ' + rErr.message }, { status: 500 });
    }

    // 3. 업무 삭제
    const { error: tErr } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('assignee_id', id);

    if (tErr) {
      return NextResponse.json({ error: '업무 삭제 실패: ' + tErr.message }, { status: 500 });
    }
  }

  // 4. 직원 삭제
  const { error: sErr } = await supabaseAdmin
    .from('staff')
    .delete()
    .eq('id', id);

  if (sErr) {
    console.error('[DELETE staff]', sErr.message);
    return NextResponse.json({ error: '삭제에 실패했습니다: ' + sErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
