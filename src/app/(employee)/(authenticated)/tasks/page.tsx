'use client';

import { useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { Task, Priority, TaskStatus } from '@/types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/constants/task-config';
import { getDueLabel, getDateOnlyLabel } from '@/lib/date';
import EmployeeHeader from '@/components/employee/EmployeeHeader';
import TaskCard from '@/components/employee/TaskCard';

/* ── 필터 옵션 ──────────────────────────────────────────────── */
const PRIORITY_FILTERS: { label: string; value: Priority | 'all' }[] = [
  { label: '높음', value: 'high' }, { label: '보통', value: 'medium' },
  { label: '낮음', value: 'low' }, { label: '전체', value: 'all' },
];
const STATUS_FILTERS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: '미완료',   value: 'todo'           },
  { label: '재작업',   value: 'rework'         },
  { label: '검토 대기', value: 'pending_review' },
  { label: '완료',     value: 'done'           },
  { label: '전체',     value: 'all'            },
];

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit',
      border: `1.5px solid ${active ? 'oklch(55% 0.14 195)' : 'oklch(88% 0.008 240)'}`,
      background: active ? 'oklch(93% 0.06 195)' : '#fff',
      color: active ? 'oklch(55% 0.14 195)' : 'oklch(50% 0.01 260)',
      transition: '150ms ease', minHeight: 30,
    }}>{label}</button>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'oklch(50% 0.01 260)', gap: 10 }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="2"/>
      </svg>
      <span style={{ fontSize: 14 }}>
        {filtered ? '해당하는 업무가 없습니다' : '배정된 업무가 없습니다'}
      </span>
    </div>
  );
}

const VALID_PRIORITY = new Set(['high', 'medium', 'low', 'all']);
const VALID_STATUS   = new Set(['todo', 'rework', 'pending_review', 'done', 'all']);

/* ── 페이지 (Suspense 래퍼) ──────────────────────────────────── */
export default function TasksPage() {
  return (
    <Suspense>
      <TasksPageContent />
    </Suspense>
  );
}

function TasksPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const priorityFilter = (
    VALID_PRIORITY.has(searchParams.get('priority') ?? '') ? searchParams.get('priority')! : 'all'
  ) as Priority | 'all';
  const statusFilter = (
    VALID_STATUS.has(searchParams.get('status') ?? '') ? searchParams.get('status')! : 'all'
  ) as TaskStatus | 'all';

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`/tasks?${params.toString()}`);
  }

  /* 현재 로그인 사용자 */
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.json()),
    staleTime: Infinity,
  });

  /* 업무 목록 */
  const { data: tasks = [], isLoading, isError, refetch } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => fetch('/api/tasks').then(r => {
      if (!r.ok) throw new Error('fetch failed');
      return r.json();
    }),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchP = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchS = statusFilter   === 'all' || t.status   === statusFilter;
      return matchP && matchS;
    });
  }, [tasks, priorityFilter, statusFilter]);

  /* 날짜별 그룹핑 */
  const groupedTasks = useMemo(() => {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const map   = new Map<string, Task[]>();

    for (const task of filteredTasks) {
      const key = task.deadline.slice(0, 10); // YYYY-MM-DD
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }

    return [...map.entries()].map(([dateKey, tasks]) => {
      const d    = new Date(dateKey);
      const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
      const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
      const dateStr = `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;

      const label = dateStr;

      return { dateKey, label, tasks, isToday: diff === 0, isPast: diff < 0 };
    });
  }, [filteredTasks]);

  return (
    <>
      <EmployeeHeader userName={me?.name ?? '...'} onRefresh={() => refetch()} />

      {/* 필터 바 */}
      <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid oklch(88% 0.008 240)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'oklch(50% 0.01 260)', flexShrink: 0 }}>우선순위</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRIORITY_FILTERS.map(f => (
              <FilterChip key={f.value} label={f.label} active={priorityFilter === f.value} onClick={() => setFilter('priority', f.value)} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'oklch(50% 0.01 260)', flexShrink: 0 }}>상태</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUS_FILTERS.map(f => (
              <FilterChip key={f.value} label={f.label} active={statusFilter === f.value}
                onClick={() => setFilter('status', f.value)} />
            ))}
          </div>
        </div>
      </div>

      {/* 업무 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'oklch(65% 0.01 260)', fontSize: 14 }}>
            불러오는 중...
          </div>
        )}
        {isError && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'oklch(62% 0.16 25)', fontSize: 14 }}>
            업무를 불러오지 못했습니다.
          </div>
        )}
        {!isLoading && !isError && filteredTasks.length === 0 && (
          <EmptyState filtered={tasks.length > 0} />
        )}

        {/* 날짜별 그룹 */}
        {groupedTasks.map(group => (
          <div key={group.dateKey} style={{ marginBottom: 20 }}>
            {/* 날짜 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: group.isPast
                  ? 'oklch(62% 0.16 25)'        // 지난 날짜: 빨간색
                  : group.isToday
                    ? 'oklch(55% 0.14 195)'      // 오늘: primary
                    : 'oklch(18% 0.01 260)',     // 미래: 기본
              }}>
                {group.label}
              </span>
              {/* 오늘 날짜 구분선 */}
              {group.isToday && (
                <div style={{ flex: 1, height: 1, background: 'oklch(55% 0.14 195)', opacity: 0.3 }} />
              )}
            </div>

            {/* 카드 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.tasks.map(task => (
                <TaskCard key={task.id} task={task} onTap={t => router.push(`/tasks/${t.id}`)} />
              ))}
            </div>
          </div>
        ))}
      </div>

    </>
  );
}
