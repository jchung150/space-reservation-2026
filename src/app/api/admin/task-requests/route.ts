/**
 * GET /api/admin/task-requests
 * 관리자용 업무 요청 목록
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return '방금 전';
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

const DEPT_MAP: Record<string, string> = {
  security: '보안', cleaning: '청소', maintenance: '시설유지보수', auto: '자동 선택',
};

const PRIORITY_MAP: Record<string, string> = {
  high: '높음', medium: '보통', low: '낮음',
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending';

  const { data, error } = await supabaseAdmin
    .from('task_requests')
    .select('*, staff:submitted_by_id(name, job_types)')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requests = (data ?? []).map((r: any) => ({
    id:            r.id,
    title:         r.title,
    description:   r.description,
    priority:      r.priority,
    priorityLabel: PRIORITY_MAP[r.priority] ?? r.priority,
    status:        r.status,
    rejectReason:  r.reject_reason ?? null,
    taskId:        r.task_id ?? null,
    photoPaths:    r.photo_paths ?? [],
    submitter:     r.staff?.name ?? '—',
    timeAgo:       timeAgo(r.created_at),
    createdAt:     r.created_at,
  }));

  return NextResponse.json(requests);
}
