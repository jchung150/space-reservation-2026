/**
 * GET /api/tasks
 * 로그인한 직원의 업무 목록 반환
 * - 미아카이브 업무 전체
 * - 아카이브된 완료 업무는 승인(updated_at) 후 7일간 표시
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';
import { mapTask } from '@/lib/task-mapper';

const SHOW_DAYS = 7;

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*, admins:created_by_id(name)')
    .eq('assignee_id', session.id)
    .order('deadline', { ascending: true });

  if (error) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json({ error: '업무 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  const cutoff = new Date(Date.now() - SHOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const visible = (data ?? []).filter(t =>
    !t.is_archived ||
    (t.is_archived && t.status === 'done' && t.updated_at >= cutoff)
  );

  return NextResponse.json(visible.map(mapTask));
}
