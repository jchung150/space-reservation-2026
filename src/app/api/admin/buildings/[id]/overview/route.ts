/**
 * GET /api/admin/buildings/[id]/overview
 * 건물 상세 페이지용 통합 데이터:
 *   기본 정보 + KPI 4개 + 진행 중 업무 리스트 + 최근 완료 10건 + 업무 유형별 카운트
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-server';

const PRIORITY_MAP: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' };
const STATUS_MAP:   Record<string, string> = {
  todo: '미완료', in_progress: '진행 중', pending_review: '검토 대기', done: '완료', rework: '재작업',
};

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function dDay(iso: string): string {
  const now  = new Date();
  const then = new Date(iso);
  const diff = Math.ceil((then.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
  if (diff === 0) return 'D-day';
  if (diff > 0)   return `D-${diff}`;
  return `D+${-diff}`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { id } = await params;

  // 1. 건물 기본 정보
  const { data: building, error: bErr } = await supabaseAdmin
    .from('buildings')
    .select('*')
    .eq('id', id)
    .single();

  if (bErr || !building) {
    return NextResponse.json({ error: '건물을 찾을 수 없습니다.' }, { status: 404 });
  }

  // 썸네일 서명 URL
  let thumbnailUrl: string | null = null;
  if (building.thumbnail_path) {
    const { data: signed } = await supabaseAdmin.storage
      .from('building-thumbnails')
      .createSignedUrl(building.thumbnail_path, 3600);
    thumbnailUrl = signed?.signedUrl ?? null;
  }

  // 2. 이 건물의 모든 업무 (KPI·리스트 계산에 사용)
  const { data: tasks, error: tErr } = await supabaseAdmin
    .from('tasks')
    .select(`
      id, title, status, priority, deadline, is_archived, updated_at, created_at,
      staff:assignee_id(name),
      task_types:task_type_id(name)
    `)
    .eq('building_id', id);

  if (tErr) {
    console.error('[GET /api/admin/buildings/[id]/overview]', tErr);
    return NextResponse.json({ error: '업무 정보를 불러오지 못했습니다.' }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTasks: any[] = tasks ?? [];

  // 3. KPI 계산
  const totalCount   = allTasks.length;
  const ongoing      = allTasks.filter(t => !t.is_archived);
  const ongoingCount = ongoing.length;

  const now       = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const thisMonthDoneCount = allTasks.filter(t => {
    if (!t.is_archived) return false;
    const done = new Date(t.updated_at);
    return done >= monthStart && done <= monthEnd;
  }).length;

  // 다음 예정: 진행 중인 업무 중 미완료·재작업 상태에서 마감일 임박순 1건
  const nextUpcoming = ongoing
    .filter(t => t.status !== 'done')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0] ?? null;

  // 4. 진행 중 업무 리스트 (마감일 임박순)
  const ongoingList = ongoing
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => ({
      id:           t.id,
      title:        t.title,
      employee:     t.staff?.name ?? '—',
      taskTypeName: t.task_types?.name ?? null,
      deadline:     fmtDateTime(t.deadline),
      status:       STATUS_MAP[t.status] ?? t.status,
      statusKey:    t.status,
      priority:     PRIORITY_MAP[t.priority] ?? t.priority,
    }));

  // 5. 최근 완료 10건 (아카이브)
  const recentDone = allTasks
    .filter(t => t.is_archived)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => ({
      id:           t.id,
      title:        t.title,
      employee:     t.staff?.name ?? '—',
      taskTypeName: t.task_types?.name ?? null,
      completedAt:  fmtDateTime(t.updated_at),
    }));

  // 6. 업무 유형별 카운트 (전체 기준)
  const typeCountMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of allTasks as any[]) {
    const name = t.task_types?.name;
    if (!name) continue;
    typeCountMap.set(name, (typeCountMap.get(name) ?? 0) + 1);
  }
  const typeStats = [...typeCountMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    building: {
      id:            building.id,
      name:          building.name,
      buildingTypes: building.building_types ?? [],
      address:       building.address ?? null,
      builtAt:       building.built_at ?? null,
      approvedAt:    building.approved_at ?? null,
      thumbnailUrl,
      isActive:      building.is_active,
    },
    kpi: {
      totalCount,
      ongoingCount,
      thisMonthDoneCount,
      nextUpcoming: nextUpcoming
        ? { id: nextUpcoming.id, title: nextUpcoming.title, dDay: dDay(nextUpcoming.deadline) }
        : null,
    },
    ongoing: ongoingList,
    recentDone,
    typeStats,
  });
}
