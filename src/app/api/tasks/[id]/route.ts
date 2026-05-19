/**
 * GET /api/tasks/[id]
 * 직원이 자신에게 배정된 업무 단건 조회
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';
import { mapTask } from '@/lib/task-mapper';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  const [taskRes, reportsRes] = await Promise.all([
    supabaseAdmin
      .from('tasks')
      .select('*, admins:created_by_id(name)')
      .eq('id', id)
      .eq('assignee_id', session.id)
      .single(),

    supabaseAdmin
      .from('reports')
      .select('id, status, reviewed_at, admins:reviewed_by_id(name), report_photos(storage_path, sort_order)')
      .eq('task_id', id)
      .eq('submitted_by_id', session.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  if (taskRes.error || !taskRes.data) {
    return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  const task = mapTask(taskRes.data);

  // 참고 이미지 서명 URL 변환
  const refPaths: string[] = (taskRes.data as any).reference_images ?? [];
  if (refPaths.length > 0) {
    const signedUrls = await Promise.all(
      refPaths.map(async (path: string) => {
        const { data: signed } = await supabaseAdmin.storage
          .from('task-references')
          .createSignedUrl(path, 3600);
        return signed?.signedUrl ?? null;
      })
    );
    task.referenceImages = signedUrls.filter(Boolean) as string[];
  }

  // 직원 제출 사진 서명 URL 변환 (가장 최근 보고)
  const latestReport = (reportsRes.data ?? [])[0] as any;
  const reportPhotos: string[] = [];
  if (latestReport?.report_photos?.length > 0) {
    const sorted = [...latestReport.report_photos].sort((a: any, b: any) => a.sort_order - b.sort_order);
    const urls = await Promise.all(
      sorted.map(async (p: any) => {
        const { data: signed } = await supabaseAdmin.storage
          .from('report-photos')
          .createSignedUrl(p.storage_path, 3600);
        return signed?.signedUrl ?? null;
      })
    );
    reportPhotos.push(...(urls.filter(Boolean) as string[]));
  }

  const approvedAt   = latestReport?.reviewed_at      ?? null;
  const approvedBy   = (latestReport as any)?.admins?.name ?? null;

  // created_by_id가 없는 업무(직원 직접 생성)는 배정자를 직원 본인 이름으로 표시
  if (!task.assignedByName) {
    task.assignedByName = session.name;
  }

  return NextResponse.json({ ...task, submittedPhotos: reportPhotos, approvedAt, approvedBy });
}
