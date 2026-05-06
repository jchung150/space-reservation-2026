'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { Priority, Task } from '@/types';
import { PRIORITY_CONFIG } from '@/constants/task-config';
import EmployeeHeader from '@/components/employee/EmployeeHeader';

/* ── 타입 ──────────────────────────────────────────────────────── */
interface CalTask {
  id:       string;
  name:     string;
  priority: Priority;
  repeat?:  boolean;
}

/* ── 유틸 ──────────────────────────────────────────────────────── */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 실 업무 목록 → 날짜별 CalTask 맵 */
function buildCalendarData(tasks: Task[]): Record<string, CalTask[]> {
  const data: Record<string, CalTask[]> = {};
  for (const task of tasks) {
    const key = task.deadline.slice(0, 10); // YYYY-MM-DD
    if (!data[key]) data[key] = [];
    data[key].push({
      id:       task.id,
      name:     task.title,
      priority: task.priority,
      repeat:   task.repeatType !== 'none',
    });
  }
  return data;
}

/* ── 아이콘 ─────────────────────────────────────────────────────── */
function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function IconRepeat({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

/* ── 요일 헤더 ──────────────────────────────────────────────────── */
function WeekdayHeader() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
      {WEEKDAYS.map((day, i) => (
        <div key={day} style={{
          textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '4px 0',
          color: i === 0 ? 'oklch(62% 0.16 25)' : i === 6 ? 'oklch(55% 0.14 195)' : 'oklch(50% 0.01 260)',
        }}>
          {day}
        </div>
      ))}
    </div>
  );
}

/* ── 날짜 셀 ────────────────────────────────────────────────────── */
function DateCell({
  date, dateKey, isToday, isSelected, isSun, isSat, tasks, onSelect,
}: {
  date: number | null; dateKey: string | null; isToday: boolean; isSelected: boolean;
  isSun: boolean; isSat: boolean; tasks: CalTask[]; onSelect: (key: string) => void;
}) {
  if (!date || !dateKey) return <div />;
  const priorities = [...new Set(tasks.map(t => t.priority))] as Priority[];
  const hasRepeat  = tasks.some(t => t.repeat);

  return (
    <div role="button" tabIndex={0} onClick={() => onSelect(dateKey)} onKeyDown={e => e.key === 'Enter' && onSelect(dateKey)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 2px 6px', cursor: 'pointer', borderRadius: 10, background: isSelected && !isToday ? 'oklch(93% 0.06 195)' : 'transparent', transition: '150ms ease', minHeight: 48, outline: 'none', userSelect: 'none' }}>
      <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? 'oklch(55% 0.14 195)' : 'transparent', color: isToday ? '#fff' : isSun ? 'oklch(62% 0.16 25)' : isSat ? 'oklch(55% 0.14 195)' : 'oklch(18% 0.01 260)', fontSize: 14, fontWeight: isToday || isSelected ? 700 : 400 }}>
        {date}
      </div>
      <div style={{ display: 'flex', gap: 2, marginTop: 3, alignItems: 'center', minHeight: 8 }}>
        {priorities.map(p => (
          <span key={p} style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_CONFIG[p].dotColor, display: 'inline-block', flexShrink: 0 }} />
        ))}
      </div>
    </div>
  );
}

/* ── 월간 뷰 ────────────────────────────────────────────────────── */
function MonthView({ year, month, todayStr, selectedDate, calendarData, onSelectDate }: {
  year: number; month: number; todayStr: string; selectedDate: string;
  calendarData: Record<string, CalTask[]>; onSelectDate: (k: string) => void;
}) {
  const cells = useMemo(() => {
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  return (
    <div>
      <WeekdayHeader />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
        {cells.map((d, i) => {
          const dateKey = d ? fmtDate(year, month, d) : null;
          return (
            <DateCell key={i} date={d} dateKey={dateKey}
              isToday={dateKey === todayStr} isSelected={dateKey === selectedDate}
              isSun={i % 7 === 0} isSat={i % 7 === 6}
              tasks={dateKey ? (calendarData[dateKey] ?? []) : []}
              onSelect={onSelectDate}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── 주간 뷰 ────────────────────────────────────────────────────── */
function WeekView({ todayStr, selectedDate, calendarData, onSelectDate }: {
  todayStr: string; selectedDate: string;
  calendarData: Record<string, CalTask[]>; onSelectDate: (k: string) => void;
}) {
  const weekDays = useMemo(() => {
    const sel   = new Date(selectedDate);
    const dow   = sel.getDay();
    const start = new Date(sel);
    start.setDate(sel.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  return (
    <div>
      <WeekdayHeader />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
        {weekDays.map((d, i) => {
          const dateKey = fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
          return (
            <DateCell key={i} date={d.getDate()} dateKey={dateKey}
              isToday={dateKey === todayStr} isSelected={dateKey === selectedDate}
              isSun={i === 0} isSat={i === 6}
              tasks={calendarData[dateKey] ?? []}
              onSelect={onSelectDate}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── 미니 업무 카드 ─────────────────────────────────────────────── */
function MiniCard({ task, onTap }: { task: CalTask; onTap: (id: string) => void }) {
  const [pressed, setPressed] = useState(false);
  const p = PRIORITY_CONFIG[task.priority];
  return (
    <div
      role="button" tabIndex={0}
      onClick={() => onTap(task.id)}
      onKeyDown={e => e.key === 'Enter' && onTap(task.id)}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid oklch(88% 0.008 240)', boxShadow: '0 1px 3px oklch(0% 0 0 / 5%)', cursor: 'pointer', transform: pressed ? 'scale(0.985)' : 'scale(1)', transition: '150ms ease', outline: 'none', userSelect: 'none' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.dotColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'oklch(18% 0.01 260)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: p.color, background: p.bgColor, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>{p.label}</span>
    </div>
  );
}

/* ── 빈 상태 ────────────────────────────────────────────────────── */
function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', color: 'oklch(50% 0.01 260)', gap: 8 }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="2" />
      </svg>
      <span style={{ fontSize: 13 }}>{label}에는 배정된 업무가 없습니다</span>
    </div>
  );
}

/* ── 메인 페이지 ────────────────────────────────────────────────── */
export default function CalendarPage() {
  const router  = useRouter();
  const [todayStr] = useState(() => {
    const d = new Date();
    return fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
  });

  const [calMode,      setCalMode]      = useState<'month' | 'week'>('month');
  const [viewYear,     setViewYear]     = useState(() => new Date().getFullYear());
  const [viewMonth,    setViewMonth]    = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
  });

  /* 현재 로그인 사용자 */
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => fetch('/api/auth/me').then(r => r.json()),
    staleTime: Infinity,
  });

  /* 실 업무 목록 → 캘린더 데이터 */
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: () => fetch('/api/tasks').then(r => r.json()),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const calendarData = useMemo(() => buildCalendarData(tasks), [tasks]);

  const monthLabel = `${viewYear}년 ${viewMonth + 1}월`;

  function prevPeriod() {
    if (calMode === 'month') {
      if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
      else setViewMonth(m => m - 1);
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 7);
      const key = fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
      setSelectedDate(key); setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
    }
  }

  function nextPeriod() {
    if (calMode === 'month') {
      if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
      else setViewMonth(m => m + 1);
    } else {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 7);
      const key = fmtDate(d.getFullYear(), d.getMonth(), d.getDate());
      setSelectedDate(key); setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
    }
  }

  /* 주간/월간 기간 내 모든 업무 (날짜순 정렬) */
  const periodTasks = useMemo(() => {
    if (calMode === 'week') {
      const sel   = new Date(selectedDate);
      const start = new Date(sel);
      start.setDate(sel.getDate() - sel.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const s = fmtDate(start.getFullYear(), start.getMonth(), start.getDate());
      const e = fmtDate(end.getFullYear(),   end.getMonth(),   end.getDate());
      return tasks.filter(t => { const d = t.deadline.slice(0, 10); return d >= s && d <= e; })
                  .sort((a, b) => a.deadline.localeCompare(b.deadline));
    } else {
      const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
      return tasks.filter(t => t.deadline.slice(0, 7) === monthStr)
                  .sort((a, b) => a.deadline.localeCompare(b.deadline));
    }
  }, [calMode, selectedDate, viewYear, viewMonth, tasks]);

  /* 날짜별 그룹핑 */
  const groupedPeriodTasks = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of periodTasks) {
      const key = task.deadline.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return [...map.entries()].map(([dateKey, list]) => {
      const [y, m, d] = dateKey.split('-').map(Number);
      const dayName   = WEEKDAYS[new Date(y, m - 1, d).getDay()];
      return { dateKey, label: `${m}월 ${d}일 (${dayName})`, tasks: list, isToday: dateKey === todayStr };
    });
  }, [periodTasks, todayStr]);

  /* 헤더 레이블 */
  const periodLabel = useMemo(() => {
    if (calMode === 'week') {
      const sel   = new Date(selectedDate);
      const start = new Date(sel);
      start.setDate(sel.getDate() - sel.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${end.getMonth() + 1}월 ${end.getDate()}일`;
    }
    return `${viewYear}년 ${viewMonth + 1}월`;
  }, [calMode, selectedDate, viewYear, viewMonth]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <EmployeeHeader userName={me?.name ?? '...'} />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* 캘린더 컨트롤 */}
        <div style={{ padding: '10px 16px 0', background: '#fff', borderBottom: '1px solid oklch(88% 0.008 240)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button type="button" onClick={prevPeriod} aria-label="이전"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'oklch(18% 0.01 260)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 }}>
              <IconChevronLeft />
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'oklch(18% 0.01 260)' }}>{monthLabel}</span>
            <button type="button" onClick={nextPeriod} aria-label="다음"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'oklch(18% 0.01 260)', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 48, minWidth: 48 }}>
              <IconChevronRight />
            </button>
          </div>

          {/* 월간 / 주간 토글 */}
          <div style={{ display: 'flex', background: 'oklch(95% 0.005 220)', borderRadius: 8, padding: 3, width: 'fit-content', margin: '0 auto 12px' }}>
            {(['month', 'week'] as const).map(mode => (
              <button key={mode} type="button" onClick={() => setCalMode(mode)}
                style={{ padding: '5px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: calMode === mode ? '#fff' : 'transparent', color: calMode === mode ? 'oklch(55% 0.14 195)' : 'oklch(50% 0.01 260)', boxShadow: calMode === mode ? '0 1px 3px oklch(0% 0 0 / 10%)' : 'none', transition: '150ms ease', minHeight: 32 }}>
                {mode === 'month' ? '월간' : '주간'}
              </button>
            ))}
          </div>

          {/* 달력 그리드 */}
          <div style={{ paddingBottom: 12 }}>
            {calMode === 'month' ? (
              <MonthView year={viewYear} month={viewMonth} todayStr={todayStr} selectedDate={selectedDate} calendarData={calendarData} onSelectDate={setSelectedDate} />
            ) : (
              <WeekView todayStr={todayStr} selectedDate={selectedDate} calendarData={calendarData} onSelectDate={setSelectedDate} />
            )}
          </div>
        </div>

        {/* 기간 업무 목록 */}
        <div style={{ flex: 1, padding: '14px 16px 24px', background: 'oklch(95% 0.005 220)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'oklch(18% 0.01 260)' }}>{periodLabel} 업무</span>
            <span style={{ fontSize: 12, color: 'oklch(50% 0.01 260)' }}>{periodTasks.length}건</span>
          </div>

          {groupedPeriodTasks.length === 0 ? (
            <EmptyState label={periodLabel} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {groupedPeriodTasks.map(group => (
                <div key={group.dateKey}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: group.isToday ? 'oklch(55% 0.14 195)' : 'oklch(50% 0.01 260)' }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {group.tasks.map(task => (
                      <MiniCard key={task.id} task={{ id: task.id, name: task.title, priority: task.priority, repeat: task.repeatType !== 'none' }} onTap={id => router.push(`/tasks/${id}`)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
