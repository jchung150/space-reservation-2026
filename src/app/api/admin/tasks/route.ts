/**
 * GET  /api/admin/tasks  - 전체 업무 목록 (필터/페이지네이션)
 * POST /api/admin/tasks  - 업무 생성
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';
import { mapAdminTask } from '@/lib/task-mapper';
import { ensureAheadInstances } from '@/lib/repeat-tasks';
import type { TaskCreateInput, RepeatType } from '@/types';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

/* ── GET ────────────────────────────────────────────────── */
export async function GET(req: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get('search')   ?? '';
  const dept     = searchParams.get('dept')     ?? '';   // 보안|청소|시설유지보수
  const priority = searchParams.get('priority') ?? '';
  const status   = searchParams.get('status')   ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1', 10);
  const limit    = parseInt(searchParams.get('limit') ?? '10', 10);

  const DEPT_MAP: Record<string, string> = {
    '보안': 'security', '청소': 'cleaning', '시설유지보수': 'maintenance',
  };

  let query = supabaseAdmin
    .from('tasks')
    .select('*, staff:assignee_id(name, job_types), admins:created_by_id(name)', { count: 'exact' })
    .eq('is_archived', false);

  const PRIORITY_LABEL: Record<string, string> = { '높음': 'high', '보통': 'medium', '낮음': 'low' };
  const STATUS_LABEL: Record<string, string> = {
    '미완료': 'todo', '진행 중': 'in_progress',
    '검토 대기': 'pending_review', '완료': 'done', '재작업': 'rework',
  };

  if (priority && PRIORITY_LABEL[priority]) query = query.eq('priority', PRIORITY_LABEL[priority]);
  if (status  && STATUS_LABEL[status])      query = query.eq('status',   STATUS_LABEL[status]);

  query = query.order('deadline', { ascending: true });

  const { data, error, count } = await query;

  if (error) {
    console.error('[GET /api/admin/tasks]', error);
    return NextResponse.json({ error: '업무 목록을 불러오지 못했습니다.' }, { status: 500 });
  }

  let tasks = data.map(mapAdminTask);

  // 검색 · 직군 필터 (post-process)
  if (search) {
    tasks = tasks.filter(t =>
      t.title.includes(search) || t.employeeName.includes(search)
    );
  }
  if (dept && DEPT_MAP[dept]) {
    const jobType = DEPT_MAP[dept];
    tasks = tasks.filter(t => t.taskJobType === jobType);
  }

  // 클라이언트 요청 시 전체 반환 (list page에서 클라이언트 페이지네이션 사용)
  const total = tasks.length;

  return NextResponse.json({ tasks, total });
}

/* ── POST ───────────────────────────────────────────────── */
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const body = await req.json() as TaskCreateInput;

  const { title, description, assigneeId, location, priority, deadline, repeatType } = body;
  if (!title?.trim() || !assigneeId || !deadline || !priority) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title:          title.trim(),
      description:    description ?? '',
      assignee_id:    assigneeId,
      created_by_id:  session.id,
      location:       location ?? '',
      priority,
      status:         'todo',
      deadline,
      repeat_type:    repeatType ?? 'none',
      repeat_days:    body.repeatDays  ?? null,
      repeat_date:    body.repeatDate  ?? null,
      task_job_type:     body.taskJobType     ?? null,
      reference_images:  body.referenceImages ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error('[POST /api/admin/tasks]', error);
    return NextResponse.json({ error: '업무 생성에 실패했습니다.' }, { status: 500 });
  }

  /* ── 반복 업무: 초기 N개 미리 생성 ── */
  if (repeatType && repeatType !== 'none') {
    try {
      await ensureAheadInstances({
        id:             data.id,
        parent_task_id: null,
        repeat_type:    repeatType as RepeatType,
      });
    } catch (e) {
      console.error('[POST /api/admin/tasks] 반복 인스턴스 생성 실패', e);
    }
  }

  return NextResponse.json(data, { status: 201 });
}
