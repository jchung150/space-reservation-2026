/**
 * GET /api/admin/archive/[id]
 * 아카이브된 업무 단건 상세 조회 (보고서용)
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const DEPT_MAP: Record<string, string> = {
  security: '보안', cleaning: '청소', maintenance: '시설유지보수',
};
const PRIORITY_MAP: Record<string, string> = {
  high: '높음', medium: '보통', low: '낮음',
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      id, title, description, priority, deadline, created_at, updated_at,
      task_job_type, reference_images, is_archived,
      staff:assignee_id ( name, job_types ),
      admins:created_by_id ( name ),
      reports (
        id, memo, status, reject_reason, created_at, reviewed_at,
        admins:reviewed_by_id ( name ),
        report_photos ( id, storage_path, file_name, sort_order )
      )
    `)
    .eq('id', id)
    .eq('is_archived', true)
    .single();

  if (error || !task) {
    return NextResponse.json({ error: '업무를 찾을 수 없습니다.' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = task as any;
  const jobTypes: string[] = t.staff?.job_types ?? [];
  const dept = t.task_job_type
    ? (DEPT_MAP[t.task_job_type] ?? '—')
    : (jobTypes.map((jt: string) => DEPT_MAP[jt] ?? jt)[0] ?? '—');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allReports: any[] = (t.reports ?? []).sort(
    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const approvedReport = allReports.find((r: any) => r.status === 'approved');
  const rejectedReports = allReports.filter((r: any) => r.status === 'rejected');

  // 서명 URL 생성 헬퍼
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function signPhotos(photos: any[]): Promise<string[]> {
    const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
    const urls = await Promise.all(sorted.map(async (p) => {
      const { data: signed } = await supabaseAdmin.storage
        .from('report-photos').createSignedUrl(p.storage_path, 3600);
      return signed?.signedUrl ?? null;
    }));
    return urls.filter(Boolean) as string[];
  }

  // 참고 이미지 서명 URL
  const refPaths: string[] = t.reference_images ?? [];
  const referenceImages = await Promise.all(
    refPaths.map(async (path: string) => {
      const { data: signed } = await supabaseAdmin.storage
        .from('task-references').createSignedUrl(path, 3600);
      return signed?.signedUrl ?? null;
    })
  ).then(urls => urls.filter(Boolean) as string[]);

  // 승인 보고 사진
  const submittedPhotos = await signPhotos(approvedReport?.report_photos ?? []);

  // 반려 이력 (사진 포함)
  const rejectionHistory = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rejectedReports.map(async (r: any, i: number) => ({
      index:       i + 1,
      memo:        r.memo ?? '',
      rejectReason: r.reject_reason ?? '',
      submittedAt: fmt(r.created_at),
      rejectedAt:  fmt(r.reviewed_at),
      photos:      await signPhotos(r.report_photos ?? []),
    }))
  );

  const isDirectRecord = !approvedReport;

  return NextResponse.json({
    id:               t.id,
    title:            t.title,
    description:      t.description ?? '',
    priority:         PRIORITY_MAP[t.priority] ?? t.priority,
    dept,
    employee:         t.staff?.name ?? '—',
    assignedBy:       t.admins?.name ?? t.staff?.name ?? '—',
    deadline:         fmt(t.deadline),
    assignedAt:       fmt(t.created_at),
    completedAt:      isDirectRecord ? fmt(t.deadline) : fmt(approvedReport?.reviewed_at ?? t.updated_at),
    reviewer:         approvedReport?.admins?.name ?? '—',
    recorder:         t.admins?.name ?? '—',
    memo:             approvedReport?.memo ?? '',
    referenceImages,
    submittedPhotos,
    rejectionHistory,
    isDirectRecord,
  });
}
