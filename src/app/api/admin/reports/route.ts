/**
 * GET /api/admin/reports
 * 완료 보고 목록
 * - "반려됨" 탭 제거에 따라 status=rejected 필터 미사용
 * - pending 보고에 이전 반려 이력(prevRejected) 표시 추가
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return '방금 전';
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

const DEPT_MAP: Record<string, string> = {
  security: '보안', cleaning: '청소', maintenance: '시설',
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status'); // pending | approved

  let query = supabaseAdmin
    .from('reports')
    .select(`
      id, status, created_at, reject_reason,
      staff:submitted_by_id ( id, name, job_types ),
      task:tasks!task_id ( id, title, priority, is_archived, task_job_type ),
      report_photos ( storage_path, sort_order )
    `)
    .order('created_at', { ascending: false });

  // rejected 상태는 목록에 표시하지 않음 (탭 제거)
  // 필터가 없으면 pending + approved 만 반환
  if (statusFilter === 'pending' || statusFilter === 'approved') {
    query = query.eq('status', statusFilter);
  } else {
    query = query.in('status', ['pending', 'approved']);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[GET /api/admin/reports]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 아카이브된 업무의 보고는 목록에서 제외
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allData: any[] = (data ?? []).filter((r: any) => r.task?.is_archived !== true);
  const pendingTaskIds = allData
    .filter(r => r.status === 'pending')
    .map(r => r.task?.id)
    .filter(Boolean);

  // 해당 업무들의 반려된 보고가 존재하는지 조회
  const rejectedTaskIds = new Set<string>();
  if (pendingTaskIds.length > 0) {
    const { data: rejected } = await supabaseAdmin
      .from('reports')
      .select('task_id')
      .eq('status', 'rejected')
      .in('task_id', pendingTaskIds);
    (rejected ?? []).forEach((r: any) => rejectedTaskIds.add(r.task_id));
  }

  const reports = await Promise.all(allData.map(async (r: any) => {
    const jobTypes: string[] = r.staff?.job_types ?? [];
    const taskJobType: string | null = r.task?.task_job_type ?? null;
    const dept = taskJobType
      ? (DEPT_MAP[taskJobType] ?? '—')
      : (jobTypes.map((jt: string) => DEPT_MAP[jt] ?? jt)[0] ?? '—');
    const taskId = r.task?.id;

    // 첫 번째 사진 서명 URL (썸네일용)
    const firstPhoto = (r.report_photos ?? [])
      .sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
    let thumbnailUrl: string | null = null;
    if (firstPhoto?.storage_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from('report-photos')
        .createSignedUrl(firstPhoto.storage_path, 3600);
      thumbnailUrl = signed?.signedUrl ?? null;
    }

    return {
      id:           r.id,
      status:       r.status,
      timeAgo:      timeAgo(r.created_at),
      createdAt:    r.created_at,
      employee:     r.staff?.name    ?? '—',
      dept,
      task:         r.task?.title    ?? '—',
      priority:     r.task?.priority ?? 'medium',
      isNew:        Date.now() - new Date(r.created_at).getTime() < 10 * 60 * 1000,
      prevRejected: r.status === 'pending' && taskId ? rejectedTaskIds.has(taskId) : false,
      thumbnailUrl,
    };
  }));

  return NextResponse.json(reports);
}
