/**
 * GET  /api/admin/task-types  - 업무 유형 목록
 * POST /api/admin/task-types  - 업무 유형 추가
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const JOB_TYPES = new Set(['security', 'cleaning', 'maintenance']);

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTaskType(row: any) {
  return {
    id:        row.id,
    name:      row.name,
    jobType:   row.job_type,
    sortOrder: row.sort_order,
    isActive:  row.is_active,
    createdAt: row.created_at,
  };
}

export async function GET(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('active') === 'true';
  const jobType    = searchParams.get('jobType') ?? '';

  let query = supabaseAdmin
    .from('task_types')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name',       { ascending: true });

  if (activeOnly)               query = query.eq('is_active', true);
  if (jobType && JOB_TYPES.has(jobType)) query = query.eq('job_type', jobType);

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/admin/task-types]', error);
    return NextResponse.json({ error: '업무 유형 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(mapTaskType));
}

export async function POST(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const body = await req.json() as { name?: string; jobType?: string; sortOrder?: number };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: '유형명을 입력해주세요.' }, { status: 400 });
  }
  if (!body.jobType || !JOB_TYPES.has(body.jobType)) {
    return NextResponse.json({ error: '직군을 선택해주세요.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('task_types')
    .insert({ name, job_type: body.jobType, sort_order: body.sortOrder ?? 0 })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 존재하는 유형명입니다.' }, { status: 409 });
    }
    console.error('[POST /api/admin/task-types]', error);
    return NextResponse.json({ error: '업무 유형 추가에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(mapTaskType(data), { status: 201 });
}
