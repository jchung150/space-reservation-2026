/**
 * GET /api/staff/profile
 * 로그인한 직원의 프로필 정보 + 이번 달 업무 통계
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const DEPT_MAP: Record<string, string> = {
  security: '보안', cleaning: '청소', maintenance: '시설',
};

function fmtDate(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'staff') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const [staffRes, tasksRes] = await Promise.all([
    /* 직원 기본 정보 */
    supabaseAdmin
      .from('staff')
      .select('name, login_id, job_types, phone, is_active, joined_at')
      .eq('id', session.id)
      .single(),

    /* 배정된 전체 업무 (아카이브 제외) */
    supabaseAdmin
      .from('tasks')
      .select('id, status')
      .eq('assignee_id', session.id)
      .eq('is_archived', false),
  ]);

  if (staffRes.error || !staffRes.data) {
    return NextResponse.json({ error: '직원 정보를 찾을 수 없습니다.' }, { status: 404 });
  }

  const staff         = staffRes.data;
  const tasks         = tasksRes.data ?? [];
  const assigned      = tasks.length;
  const pendingReview = tasks.filter(t => t.status === 'pending_review').length;
  const done          = tasks.filter(t => t.status === 'done').length;
  const rate          = assigned > 0 ? Math.round((done / assigned) * 100) : null;

  const jobTypes: string[] = staff.job_types ?? [];
  const dept = jobTypes.map((jt: string) => DEPT_MAP[jt] ?? jt).join('·') || '—';

  return NextResponse.json({
    name:     staff.name,
    loginId:  staff.login_id,
    dept,
    jobTypes,
    phone:    staff.phone ?? '',
    isActive: staff.is_active,
    joinedAt: fmtDate(staff.joined_at),
    stats: { assigned, pendingReview, done, rate },
  });
}
