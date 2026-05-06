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

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return '방금 전';
  if (diff < 3600)  return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  // 이번 주 (일요일 ~ 토요일)
  const dow       = now.getDay();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow).toISOString();
  const weekEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow + 7).toISOString();

  const [tasksRes, reportsRes] = await Promise.all([
    /* 전체 미아카이브 업무 */
    supabaseAdmin
      .from('tasks')
      .select('id, title, status, priority, deadline, assignee_id, staff:assignee_id(name, job_types)')
      .eq('is_archived', false),

    /* 검토 대기 보고 최근 5건 */
    supabaseAdmin
      .from('reports')
      .select('id, status, created_at, staff:submitted_by_id(name, job_types), task:tasks!task_id(title, is_archived)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTasks:   any[] = tasksRes.data  ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allReports: any[] = reportsRes.data ?? [];

  /* ── KPI ── */
  const kpi = {
    total:         allTasks.length,
    todo:          allTasks.filter(t => ['todo', 'rework'].includes(t.status)).length,
    pendingReview: allTasks.filter(t => t.status === 'pending_review').length,
    done:          allTasks.filter(t => t.status === 'done').length,
  };

  /* ── 이번 주 마감 업무 (최대 10건) ── */
  const todayTasks = allTasks
    .filter(t => t.deadline >= weekStart && t.deadline < weekEnd)
    .sort((a, b) => {
      const PO: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (PO[a.priority] ?? 1) - (PO[b.priority] ?? 1);
    })
    .slice(0, 10)
    .map(t => ({
      id:           t.id,
      title:        t.title,
      priority:     t.priority,
      status:       t.status,
      deadline:     t.deadline,
      employeeName: t.staff?.name ?? '—',
      dept:         ((t.staff?.job_types ?? []) as string[])
                      .map((jt: string) => DEPT_MAP[jt] ?? jt).join('·') || '—',
      jobTypes:     t.staff?.job_types ?? [],
    }));

  /* ── 마감 기한 초과 미완료 업무 (우선순위 순) ── */
  const overdueNow = now.toISOString();
  const overdueTasks = allTasks
    .filter(t => ['todo', 'rework'].includes(t.status) && t.deadline < overdueNow)
    .sort((a, b) => {
      const PO: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return (PO[a.priority] ?? 1) - (PO[b.priority] ?? 1);
    })
    .map(t => ({
      id:           t.id,
      title:        t.title,
      priority:     t.priority,
      status:       t.status,
      deadline:     t.deadline,
      employeeName: t.staff?.name ?? '—',
      dept:         ((t.staff?.job_types ?? []) as string[])
                      .map((jt: string) => DEPT_MAP[jt] ?? jt).join('·') || '—',
    }));

  /* ── 검토 대기 보고 (아카이브된 업무 제외) ── */
  const recentReports = allReports
    .filter((r: any) => r.task?.is_archived !== true)
    .map((r: any) => ({
      id:       r.id,
      employee: r.staff?.name ?? '—',
      dept:     ((r.staff?.job_types ?? []) as string[])
                  .map((jt: string) => DEPT_MAP[jt] ?? jt).join('·') || '—',
      task:     r.task?.title ?? '—',
      timeAgo:  timeAgo(r.created_at),
      status:   r.status,
    }));

  return NextResponse.json({ kpi, todayTasks, overdueTasks, recentReports });
}
