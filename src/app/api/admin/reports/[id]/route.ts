/**
 * GET   /api/admin/reports/[id]  - 보고 상세 (검토 화면용)
 * PATCH /api/admin/reports/[id]  - 승인 또는 반려 처리
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const DEPT_MAP: Record<string, string> = {
  security: '보안', cleaning: '청소', maintenance: '시설',
};

function fmt(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function fmtDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/* ── GET ──────────────────────────────────────────────────── */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('reports')
    .select(`
      id, status, memo, reject_reason, created_at, reviewed_at,
      staff:submitted_by_id ( id, name, job_types ),
      task:tasks!task_id (
        id, title, priority, description, deadline, created_at, task_job_type, reference_images,
        admins:created_by_id ( name ),
        buildings:building_id ( name ),
        task_types:task_type_id ( name )
      ),
      photos:report_photos ( id, storage_path, file_name, sort_order )
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '보고를 찾을 수 없습니다.' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  const jobTypes: string[] = r.staff?.job_types ?? [];
  const taskJobType: string | null = r.task?.task_job_type ?? null;
  const dept = taskJobType
    ? (DEPT_MAP[taskJobType] ?? '—')
    : (jobTypes.map((jt: string) => DEPT_MAP[jt] ?? jt)[0] ?? '—');

  const taskId: string = r.task?.id ?? '';

  // 같은 업무의 이전 반려 이력 조회 (현재 보고 제외)
  const { data: prevReportsRaw } = await supabaseAdmin
    .from('reports')
    .select('id, memo, reject_reason, created_at, reviewed_at')
    .eq('task_id', taskId)
    .eq('status', 'rejected')
    .neq('id', id)
    .order('created_at', { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previousRejections = (prevReportsRaw ?? []).map((pr: any) => ({
    memo:        pr.memo,
    rejectReason: pr.reject_reason ?? '',
    submittedAt: fmt(pr.created_at),
    rejectedAt:  fmt(pr.reviewed_at),
  }));

  const [photos, referenceImages] = await Promise.all([
    Promise.all(
      (r.photos ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map(async (p: any) => {
          const { data: signedData } = await supabaseAdmin.storage
            .from('report-photos')
            .createSignedUrl(p.storage_path, 3600);
          return {
            id:          p.id,
            storagePath: p.storage_path,
            fileName:    p.file_name,
            url:         signedData?.signedUrl ?? null,
          };
        })
    ),
    Promise.all(
      ((r.task?.reference_images ?? []) as string[]).map(async (path: string) => {
        const { data: signed } = await supabaseAdmin.storage
          .from('task-references')
          .createSignedUrl(path, 3600);
        return signed?.signedUrl ?? null;
      })
    ).then(urls => urls.filter(Boolean) as string[]),
  ]);

  return NextResponse.json({
    id:             r.id,
    status:         r.status,
    memo:           r.memo,
    rejectReason:   r.reject_reason ?? null,
    submittedAt:    fmt(r.created_at),
    employee:       r.staff?.name ?? '—',
    dept,
    task:           r.task?.title       ?? '—',
    priority:       r.task?.priority    ?? 'medium',
    taskDescription: r.task?.description ?? '',
    taskDue:        fmt(r.task?.deadline ?? null),
    taskAssignedAt: fmt(r.task?.created_at ?? null),
    taskBuilding:   r.task?.buildings?.name ?? null,
    taskTypeName:   r.task?.task_types?.name ?? null,
    assignedByName: r.task?.admins?.name ?? '—',
    rejectionCount:     previousRejections.length,
    previousRejections,
    photos,
    referenceImages,
  });
}

/* ── PATCH (승인 / 반려) ────────────────────────────────── */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;
  const { action, rejectReason } = await req.json() as {
    action: 'approve' | 'reject' | 'undo_approve';
    rejectReason?: string;
  };

  if (!['approve', 'reject', 'undo_approve'].includes(action)) {
    return NextResponse.json({ error: '잘못된 action입니다.' }, { status: 400 });
  }
  if (action === 'reject' && !rejectReason?.trim()) {
    return NextResponse.json({ error: '반려 사유를 입력해주세요.' }, { status: 400 });
  }

  // 반려 횟수 제한: 동일 업무에서 최대 2회
  if (action === 'reject') {
    const { data: currentReport } = await supabaseAdmin
      .from('reports')
      .select('task_id')
      .eq('id', id)
      .single();

    if (currentReport) {
      const { count } = await supabaseAdmin
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('task_id', currentReport.task_id)
        .eq('status', 'rejected');

      if ((count ?? 0) >= 2) {
        return NextResponse.json({ error: '반려는 최대 2회까지만 가능합니다. 이 보고는 승인만 할 수 있습니다.' }, { status: 400 });
      }
    }
  }

  // 승인 취소: 보고 → pending, 업무 → pending_review
  if (action === 'undo_approve') {
    const { data: report, error: rErr } = await supabaseAdmin
      .from('reports')
      .update({ status: 'pending', reviewed_by_id: null, reviewed_at: null })
      .eq('id', id)
      .select('task_id')
      .single();

    if (rErr || !report) {
      return NextResponse.json({ error: '승인 취소에 실패했습니다.' }, { status: 500 });
    }

    await supabaseAdmin
      .from('tasks')
      .update({ status: 'pending_review' })
      .eq('id', report.task_id);

    return NextResponse.json({ ok: true });
  }

  // 1. 보고 상태 업데이트
  const reportUpdate: Record<string, unknown> = {
    status:         action === 'approve' ? 'approved' : 'rejected',
    reviewed_by_id: session.id,
    reviewed_at:    new Date().toISOString(),
  };
  if (action === 'reject') reportUpdate.reject_reason = rejectReason;

  const { data: report, error: rErr } = await supabaseAdmin
    .from('reports')
    .update(reportUpdate)
    .eq('id', id)
    .select('task_id')
    .single();

  if (rErr || !report) {
    return NextResponse.json({ error: '보고 처리에 실패했습니다.' }, { status: 500 });
  }

  // 2. 연관 업무 상태 동기화 — 승인 시 자동 아카이브
  const taskUpdate: Record<string, unknown> =
    action === 'approve'
      ? { status: 'done', is_archived: true }
      : { status: 'rework', rework_reason: rejectReason };

  await supabaseAdmin
    .from('tasks')
    .update(taskUpdate)
    .eq('id', report.task_id);

  return NextResponse.json({ ok: true });
}
