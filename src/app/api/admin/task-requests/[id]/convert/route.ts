/**
 * POST /api/admin/task-requests/[id]/convert
 * 업무 요청을 'converted' 상태로 마킹
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const { taskId } = await req.json().catch(() => ({}));

  const { error } = await supabaseAdmin
    .from('task_requests')
    .update({ status: 'converted', task_id: taskId ?? null })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
