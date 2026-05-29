/**
 * GET    /api/admin/tasks/[id]  - 업무 상세 (보고 목록 포함)
 * PATCH  /api/admin/tasks/[id]  - 업무 수정
 * DELETE /api/admin/tasks/[id]  - 업무 삭제
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';
import { mapAdminTask } from '@/lib/task-mapper';
import type { TaskUpdateInput } from '@/types';

const DEPT_MAP: Record<string, string> = {
  security: '보안', cleaning: '청소', maintenance: '시설',
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return '방금 전';
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return null;
  return session;
}

/* ── GET ──────────────────────────────────────────────── */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const { id } = await params;

  const [taskRes, reportsRes] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select('*, staff:assignee_id(name, job_types), admins:created_by_id(name)')
      .eq('id', id)
      .single(),

    supabaseAdmin
      .from('reports')
      .select('id, status, memo, reject_reason, created_at, reviewed_at, staff:submitted_by_id(name), admins:reviewed_by_id(name), report_photos(storage_path, sort_order)')
      .eq('task_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (taskRes.error || !taskRes.data) {
    return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  // 모든 보고의 사진 서명 URL 변환 (이력 포함)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reports = await Promise.all((reportsRes.data ?? []).map(async (r: any) => {
    const sortedPhotos = [...(r.report_photos ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
    const photoUrls = await Promise.all(
      sortedPhotos.map(async (p: any) => {
        const { data: signed } = await supabaseAdmin.storage
          .from('report-photos')
          .createSignedUrl(p.storage_path, 3600);
        return signed?.signedUrl ?? null;
      })
    );
    return {
      id:           r.id,
      status:       r.status,
      memo:         r.memo,
      rejectReason: r.reject_reason ?? null,
      submittedBy:  r.staff?.name ?? '—',
      reviewedBy:   r.admins?.name ?? null,
      timeAgo:      timeAgo(r.created_at),
      reviewedAt:   r.reviewed_at,
      photos:       photoUrls.filter(Boolean) as string[],
    };
  }));

  // reference_images 서명 URL 변환
  const paths: string[] = (taskRes.data as any).reference_images ?? [];
  const referenceImages = paths.length > 0
    ? (await Promise.all(
        paths.map(async (path: string) => {
          const { data: signed } = await supabaseAdmin.storage
            .from('task-references')
            .createSignedUrl(path, 3600);
          return signed?.signedUrl ?? null;
        })
      )).filter(Boolean) as string[]
    : [];

  // 최신 보고의 사진 (기존 UI 호환)
  const submittedPhotos: string[] = reports[0]?.photos ?? [];

  return NextResponse.json({
    ...mapAdminTask(taskRes.data),
    reports,
    referenceImages,
    referenceImagePaths: paths,
    submittedPhotos,
  });
}

/* ── PATCH ────────────────────────────────────────────── */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as TaskUpdateInput;

  const updateData: Record<string, unknown> = {};
  if (body.title            !== undefined) updateData.title             = body.title;
  if (body.description      !== undefined) updateData.description       = body.description;
  if (body.assigneeId       !== undefined) updateData.assignee_id       = body.assigneeId;
  if (body.location         !== undefined) updateData.location          = body.location;
  if (body.priority         !== undefined) updateData.priority          = body.priority;
  if (body.deadline         !== undefined) updateData.deadline          = body.deadline;
  if (body.referenceImages  !== undefined) updateData.reference_images  = body.referenceImages;
  if (body.repeatType  !== undefined) updateData.repeat_type  = body.repeatType;
  if (body.repeatDays  !== undefined) updateData.repeat_days  = body.repeatDays;
  if (body.repeatDate  !== undefined) updateData.repeat_date  = body.repeatDate;
  if (body.status      !== undefined) updateData.status       = body.status;
  if (body.reworkReason !== undefined) updateData.rework_reason = body.reworkReason;

  const { data, error } = await supabaseAdmin
    .from('tasks').update(updateData).eq('id', id).select().single();

  if (error) {
    console.error('[PATCH /api/admin/tasks]', error);
    return NextResponse.json({ error: '업무 수정에 실패했습니다.' }, { status: 500 });
  }
  return NextResponse.json(data);
}

/* ── DELETE ───────────────────────────────────────────── */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });

  const { id } = await params;

  // 1. 이 업무에 연결된 보고 ID 목록 조회
  const { data: reports } = await supabaseAdmin
    .from('reports')
    .select('id')
    .eq('task_id', id);

  const reportIds = (reports ?? []).map((r: { id: string }) => r.id);

  // 2. 보고 사진 삭제
  if (reportIds.length > 0) {
    const { data: photos } = await supabaseAdmin
      .from('report_photos')
      .select('storage_path')
      .in('report_id', reportIds);

    // Storage 파일 삭제
    if (photos && photos.length > 0) {
      const paths = photos.map((p: { storage_path: string }) => p.storage_path);
      await supabaseAdmin.storage.from('report-photos').remove(paths);
    }

    await supabaseAdmin.from('report_photos').delete().in('report_id', reportIds);

    // 3. 보고 삭제
    await supabaseAdmin.from('reports').delete().in('id', reportIds);
  }

  // 4. 업무 삭제
  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id);

  if (error) {
    console.error('[DELETE /api/admin/tasks]', error);
    return NextResponse.json({ error: '업무 삭제에 실패했습니다: ' + error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
