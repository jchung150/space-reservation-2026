/**
 * POST /api/tasks/self
 * 현장 직원이 자신에게 배정된 업무를 직접 생성
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { title, description, priority, deadline } = await req.json() as {
    title: string;
    description?: string;
    priority: 'high' | 'medium' | 'low';
    deadline?: string;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: '업무명을 입력해주세요.' }, { status: 400 });
  }

  // 직원의 직군 조회 (task_job_type 자동 설정)
  const { data: staff } = await supabaseAdmin
    .from('staff')
    .select('job_types')
    .eq('id', session.id)
    .single();

  const jobTypes: string[] = (staff as any)?.job_types ?? [];
  const taskJobType = jobTypes[0] ?? null;

  // 마감일: 요청 값 사용, 없으면 7일 후 기본값
  const deadlineISO = deadline ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title:          title.trim(),
      description:    description?.trim() ?? '',
      assignee_id:    session.id,
      created_by_id:  null,
      location:       '',
      priority:       priority ?? 'medium',
      status:         'todo',
      deadline:       deadlineISO,
      repeat_type:    'none',
      task_job_type:  taskJobType,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[POST /api/tasks/self]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
