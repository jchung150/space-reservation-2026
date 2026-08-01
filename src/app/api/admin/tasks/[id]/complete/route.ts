/**
 * POST /api/admin/tasks/[id]/complete
 * 관리자 완료 처리 — 직원 보고 없이 업무를 done + is_archived 상태로 전환
 * 선택적으로 사진 경로를 받아 참고 이미지에 append
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { referenceImages?: string[] };
  const newPaths = Array.isArray(body.referenceImages) ? body.referenceImages : [];

  // 기존 참고 이미지 조회 (있으면 append)
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('tasks')
    .select('reference_images, is_archived')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  const merged = [...((existing.reference_images ?? []) as string[]), ...newPaths];

  const { error } = await supabaseAdmin
    .from('tasks')
    .update({
      status:           'done',
      is_archived:      true,
      reference_images: merged,
    })
    .eq('id', id);

  if (error) {
    console.error('[POST /api/admin/tasks/[id]/complete]', error);
    return NextResponse.json({ error: '완료 처리에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
