/**
 * GET /api/admin/dashboard
 * 대시보드에 필요한 모든 데이터를 한 번에 반환
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const DEPT_MAP: Record<string, string> = {
  security: '보안', cleaning: '청소', maintenance: '시설',
};

const PO: Record<string, number> = { high: 0, medium: 1, low: 2 };

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { data: raw, error } = await supabaseAdmin
    .from('tasks')
    .select('id, title, status, priority, deadline, task_job_type, staff:assignee_id(name, job_types)')
    .eq('is_archived', false)
    .order('deadline', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTasks: any[] = raw ?? [];

  /* ── KPI ── */
  const kpi = {
    total:         allTasks.length,
    todo:          allTasks.filter(t => ['todo', 'rework'].includes(t.status)).length,
    pendingReview: allTasks.filter(t => t.status === 'pending_review').length,
    done:          allTasks.filter(t => t.status === 'done').length,
  };

  /* ── 전체 업무 목록 (우선순위 → 마감일 순) ── */
  const tasks = allTasks
    .sort((a, b) => (PO[a.priority] ?? 1) - (PO[b.priority] ?? 1))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => {
      const jobTypes: string[] = t.staff?.job_types ?? [];
      const deptFromStaff = jobTypes.map((jt: string) => DEPT_MAP[jt] ?? jt)[0] ?? '—';
      const dept = t.task_job_type ? (DEPT_MAP[t.task_job_type] ?? deptFromStaff) : deptFromStaff;
      return {
        id:           t.id,
        title:        t.title,
        priority:     t.priority,
        status:       t.status,
        deadline:     t.deadline,
        employeeName: t.staff?.name ?? '—',
        dept,
      };
    });

  return NextResponse.json({ kpi, tasks });
}
