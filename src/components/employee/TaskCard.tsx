'use client';

import { useState } from 'react';
import type { Task } from '@/types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/constants/task-config';
import { getDueLabel } from '@/lib/date';

interface Props {
  task: Task;
  onTap: (task: Task) => void;
}

export default function TaskCard({ task, onTap }: Props) {
  const [pressed, setPressed] = useState(false);
  const p = PRIORITY_CONFIG[task.priority];
  const s = STATUS_CONFIG[task.status];
  const dueLabel = getDueLabel(task.deadline);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTap(task)}
      onKeyDown={(e) => e.key === 'Enter' && onTap(task)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: '#fff',
        borderRadius: 12,
        border: '1px solid oklch(88% 0.008 240)',
        boxShadow: '0 1px 4px oklch(0% 0 0 / 6%)',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: '150ms ease',
        userSelect: 'none',
        outline: 'none',
      }}
    >
      {/* 본문 */}
      <div
        style={{
          flex: 1,
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* 우선순위 + 상태 배지 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* 우선순위 배지 */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: p.color,
              background: p.bgColor,
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: p.dotColor,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {p.label}
          </span>

          {/* 상태 배지 */}
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: s.color,
              background: s.bgColor,
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            {s.label}
          </span>

          {/* 반복 chip */}
          {task.repeatType && task.repeatType !== 'none' && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: 'oklch(55% 0.14 195)',
              background: 'oklch(93% 0.06 195)',
              borderRadius: 6, padding: '2px 7px',
            }}>
              {{ daily:'매일', weekly:'매주', monthly:'매월', yearly:'매년' }[task.repeatType] ?? '반복'}
            </span>
          )}
        </div>

        {/* 업무명 */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'oklch(18% 0.01 260)',
            lineHeight: 1.4,
          }}
        >
          {task.title}
        </div>

        {/* 마감 일시 */}
        <div
          style={{
            fontSize: 13,
            color: 'oklch(50% 0.01 260)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {/* 시계 아이콘 */}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          마감 {dueLabel}
        </div>
      </div>

      {/* 우측 화살표 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingRight: 12,
          color: 'oklch(50% 0.01 260)',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
  );
}
