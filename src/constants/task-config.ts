import type { Priority, TaskStatus } from '@/types';

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; dotColor: string; bgColor: string }
> = {
  high: {
    label: '높음',
    color: 'oklch(62% 0.16 25)',
    dotColor: 'oklch(62% 0.16 25)',
    bgColor: 'oklch(62% 0.16 25 / 12%)',
  },
  medium: {
    label: '보통',
    color: 'oklch(55% 0.16 75)',
    dotColor: 'oklch(75% 0.16 85)',
    bgColor: 'oklch(75% 0.16 85 / 15%)',
  },
  low: {
    label: '낮음',
    color: 'oklch(45% 0.15 160)',
    dotColor: 'oklch(62% 0.15 160)',
    bgColor: 'oklch(62% 0.15 160 / 12%)',
  },
};

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bgColor: string }
> = {
  todo: {
    label: '미완료',
    color: 'oklch(50% 0.01 260)',
    bgColor: 'oklch(92% 0.008 240)',
  },
  in_progress: {
    label: '진행 중',
    color: 'oklch(55% 0.14 195)',
    bgColor: 'oklch(93% 0.06 195)',
  },
  pending_review: {
    label: '검토 대기',
    color: 'oklch(55% 0.14 195)',
    bgColor: 'oklch(93% 0.06 195)',
  },
  done: {
    label: '완료',
    color: 'oklch(45% 0.15 160)',
    bgColor: 'oklch(92% 0.06 160)',
  },
  rework: {
    label: '재작업',
    color: 'oklch(62% 0.16 25)',
    bgColor: 'oklch(97% 0.01 25)',
  },
};
