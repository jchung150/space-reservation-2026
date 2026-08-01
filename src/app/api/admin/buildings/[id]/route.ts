/**
 * PATCH  /api/admin/buildings/[id]  - 건물 수정 (이름/정렬/활성화)
 * DELETE /api/admin/buildings/[id]  - 건물 삭제 (사용 중인 경우 차단)
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { name?: string; sortOrder?: number; isActive?: boolean };

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed) return NextResponse.json({ error: '건물명을 입력해주세요.' }, { status: 400 });
    update.name = trimmed;
  }
  if (body.sortOrder !== undefined) update.sort_order = body.sortOrder;
  if (body.isActive  !== undefined) update.is_active  = body.isActive;

  const { data, error } = await supabaseAdmin
    .from('buildings')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 건물명입니다.' }, { status: 409 });
    }
    console.error('[PATCH /api/admin/buildings]', error);
    return NextResponse.json({ error: '건물 수정에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    id:        data.id,
    name:      data.name,
    sortOrder: data.sort_order,
    isActive:  data.is_active,
    createdAt: data.created_at,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  // 사용 중인지 확인 — 하나라도 있으면 삭제 차단
  const { count, error: countErr } = await supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('building_id', id);

  if (countErr) {
    console.error('[DELETE /api/admin/buildings] count', countErr);
    return NextResponse.json({ error: '건물 사용 여부를 확인하지 못했습니다.' }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json({
      error: `이 건물은 ${count}건의 업무에서 사용 중이라 삭제할 수 없습니다. 대신 비활성화하세요.`,
    }, { status: 409 });
  }

  const { error } = await supabaseAdmin.from('buildings').delete().eq('id', id);
  if (error) {
    console.error('[DELETE /api/admin/buildings]', error);
    return NextResponse.json({ error: '건물 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
