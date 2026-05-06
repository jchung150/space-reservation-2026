/**
 * 반복 업무 롤링 생성 유틸리티
 *
 * 전략: 항상 미완료 인스턴스를 N개 유지
 *   매일/매주/매월 → 3개
 *   매년          → 2개
 *
 * 트리거:
 *   - 최초 업무 생성 시   → N개 미리 생성
 *   - 아카이브(완료 확정) → 부족한 만큼 추가 생성
 *
 * 계보 구조: 첫 번째 업무가 루트(parent_task_id=null),
 *           이후 인스턴스는 모두 루트를 parent_task_id 로 참조
 */
import { supabaseAdmin } from './supabase-server';
import type { RepeatType } from '@/types';

/* ── 주기별 최대 활성 인스턴스 수 ────────────────────────────── */
export const MAX_AHEAD: Record<string, number> = {
  daily: 3, weekly: 3, monthly: 3, yearly: 2,
};

/* ── 다음 마감일 계산 ─────────────────────────────────────────── */
/**
 * @param deadline    현재(가장 최근) 마감일 ISO 문자열
 * @param repeatType  반복 주기
 * @param originalDay 루트 업무의 원래 날짜(1~31) — monthly에서 말일 처리용
 */
export function getNextDeadline(
  deadline: string,
  repeatType: RepeatType,
  originalDay?: number,
): string {
  const d = new Date(deadline);

  switch (repeatType) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;

    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;

    case 'monthly': {
      // 원래 날짜(예: 30일) 기준 — 해당 월에 없으면 말일로 대체
      const day       = originalDay ?? d.getDate();
      const nextMonth = d.getMonth() + 1;
      const nextYear  = nextMonth > 11 ? d.getFullYear() + 1 : d.getFullYear();
      const normMonth = nextMonth % 12;
      const lastDay   = new Date(nextYear, normMonth + 1, 0).getDate();
      d.setFullYear(nextYear, normMonth, Math.min(day, lastDay));
      break;
    }

    case 'yearly': {
      const nextYear = d.getFullYear() + 1;
      // 2/29 → 다음 해 2/28 처리
      const lastDay = new Date(nextYear, d.getMonth() + 1, 0).getDate();
      d.setFullYear(nextYear, d.getMonth(), Math.min(d.getDate(), lastDay));
      break;
    }

    default:
      break;
  }

  return d.toISOString();
}

/* ── 시리즈 루트 ID 반환 ─────────────────────────────────────── */
export function getRootId(task: { id: string; parent_task_id: string | null }): string {
  return task.parent_task_id ?? task.id;
}

/* ── 시리즈의 활성(미완료·미아카이브) 인스턴스 수 ──────────── */
export async function countActiveInstances(rootId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .or(`id.eq.${rootId},parent_task_id.eq.${rootId}`)
    .eq('is_archived', false)
    .not('status', 'in', '("done")');

  return count ?? 0;
}

/* ── 시리즈에서 가장 늦은 마감일 조회 ──────────────────────── */
export async function getLatestDeadline(rootId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('tasks')
    .select('deadline')
    .or(`id.eq.${rootId},parent_task_id.eq.${rootId}`)
    .order('deadline', { ascending: false })
    .limit(1)
    .single();

  return (data as { deadline: string } | null)?.deadline ?? null;
}

/* ── 루트 업무 상세 조회 (원본 날짜 추출용) ─────────────────── */
async function getRootTask(rootId: string) {
  const { data } = await supabaseAdmin
    .from('tasks')
    .select('id, title, description, assignee_id, created_by_id, location, priority, repeat_type, deadline, task_job_type')
    .eq('id', rootId)
    .single();
  return data as {
    id: string; title: string; description: string;
    assignee_id: string; created_by_id: string;
    location: string; priority: string;
    repeat_type: RepeatType; deadline: string;
  } | null;
}

/* ── 핵심: 부족한 만큼 다음 인스턴스 생성 ──────────────────── */
export async function ensureAheadInstances(task: {
  id: string;
  parent_task_id: string | null;
  repeat_type: RepeatType;
}): Promise<void> {
  const repeatType = task.repeat_type;
  if (!repeatType || repeatType === 'none') return;

  const maxAhead = MAX_AHEAD[repeatType] ?? 3;
  const rootId   = getRootId(task);

  /* 현재 활성 인스턴스 수 확인 */
  const activeCount = await countActiveInstances(rootId);
  if (activeCount >= maxAhead) return;

  /* 루트 업무에서 원본 날짜(day) 추출 */
  const rootTask = await getRootTask(rootId);
  if (!rootTask) return;
  const originalDay = new Date(rootTask.deadline).getDate();

  /* 가장 늦은 마감일 이후로 추가 생성 */
  const latestDeadline = await getLatestDeadline(rootId);
  if (!latestDeadline) return;

  let currentDeadline = latestDeadline;
  let toCreate = maxAhead - activeCount;

  while (toCreate > 0) {
    const nextDeadline = getNextDeadline(currentDeadline, repeatType, originalDay);

    await supabaseAdmin.from('tasks').insert({
      title:          rootTask.title,
      description:    rootTask.description,
      assignee_id:    rootTask.assignee_id,
      created_by_id:  rootTask.created_by_id,
      location:       rootTask.location,
      priority:       rootTask.priority,
      status:         'todo',
      deadline:       nextDeadline,
      repeat_type:    repeatType,
      parent_task_id: rootId,
      task_job_type:  (rootTask as any).task_job_type ?? null, // 배정 직군 상속
    });

    currentDeadline = nextDeadline;
    toCreate--;
  }
}
