/**
 * GET /api/admin/archive
 * 아카이브(완료 확정) 업무 목록 + 통계
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const DEPT_MAP: Record<string, string> = {
  security: '보안', cleaning: '청소', maintenance: '시설',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: '높음', medium: '보통', low: '낮음',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

function durationHours(from: string, to: string): string {
  const h = (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000;
  return `${Math.max(0.1, Math.round(h * 10) / 10).toFixed(1)}시간`;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search   = searchParams.get('search')   ?? '';
  const dept     = searchParams.get('dept')     ?? '';
  const priority = searchParams.get('priority') ?? '';

  /* 아카이브된 업무 — is_archived = true 인 것만 */
  const { data: raw, error } = await supabaseAdmin
    .from('tasks')
    .select(`
      id, title, priority, created_at, updated_at, task_job_type,
      staff:assignee_id(name, job_types),
      reports(
        id, memo, reviewed_at,
        admins:reviewed_by_id(name),
        report_photos(id, storage_path, file_name, sort_order)
      )
    `)
    .eq('is_archived', true)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[GET /api/admin/archive]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tasks = await Promise.all((raw ?? []).map(async (t: any) => {
    const jobTypes: string[]  = t.staff?.job_types ?? [];
    const depts               = jobTypes.map((jt: string) => DEPT_MAP[jt] ?? jt);
    // 배정 직군: 업무 생성 시 선택한 직군(task_job_type) 우선, 없으면 직원 대표 직군
    const taskDept = t.task_job_type ? (DEPT_MAP[t.task_job_type] ?? depts[0] ?? '—') : (depts[0] ?? '—');
    // 승인된 보고 중 가장 최근 것
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approvedReport      = (t.reports ?? []).find((r: any) => r.reviewed_at);
    // archived_at 없으면 승인 시각(reviewed_at) → 업무 완료 시각(updated_at) 순으로 사용
    const archivedAt          = approvedReport?.reviewed_at ?? t.updated_at ?? t.created_at;

    // 사진: 승인된 보고의 첨부 사진 + 서명 URL (1시간 유효)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawPhotos = (approvedReport?.report_photos ?? []) as any[];
    const photos = await Promise.all(
      rawPhotos
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map(async (p: any) => {
          const { data: signed } = await supabaseAdmin.storage
            .from('report-photos')
            .createSignedUrl(p.storage_path, 3600);
          return {
            id:          p.id,
            storagePath: p.storage_path,
            fileName:    p.file_name,
            url:         signed?.signedUrl ?? null,
          };
        })
    );

    return {
      id:               t.id,
      title:            t.title,
      priority:         t.priority,
      employee:         t.staff?.name ?? '—',
      dept:             taskDept,
      jobTypes,
      completedAt:      fmtDate(archivedAt),
      completedAtRaw:   archivedAt,
      duration:         durationHours(t.created_at, archivedAt),
      reviewer:         approvedReport?.admins?.name ?? '관리자',
      memo:             approvedReport?.memo ?? '',
      photos,
      hasApprovedReport: !!approvedReport,
    };
  }));

  /* 클라이언트 검색·필터 (post-process) */
  if (search) {
    tasks = tasks.filter(t => t.title.includes(search) || t.employee.includes(search));
  }
  if (dept) {
    const deptLabel = dept === '시설유지보수' ? '시설' : dept;
    tasks = tasks.filter(t => t.dept === deptLabel);
  }
  if (priority) {
    const pv = Object.entries(PRIORITY_LABEL).find(([, v]) => v === priority)?.[0];
    if (pv) tasks = tasks.filter(t => t.priority === pv);
  }

  const total   = tasks.length;
  const done    = tasks.filter(t => t.hasApprovedReport).length;
  const notDone = total - done;

  return NextResponse.json({
    tasks,
    stats: { total, done, notDone },
  });
}
