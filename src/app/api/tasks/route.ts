/**
 * GET /api/tasks
 * 로그인한 직원의 업무 목록 반환 — 아카이브된 업무 제외
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';
import { mapTask } from '@/lib/task-mapper';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*, admins:created_by_id(name), buildings:building_id(name), task_types:task_type_id(name)')
    .eq('assignee_id', session.id)
    .eq('is_archived', false)
    .order('deadline', { ascending: true });

  if (error) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json({ error: '업무 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(mapTask));
}
