import type { Task } from '@/types';

function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function tomorrowAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysAgoAt(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const DUMMY_TASKS: Task[] = [
  {
    id: '1',
    title: '1층 로비 소화기 점검',
    description:
      '1층 로비 소화기 3개의 압력 게이지를 확인하고 이상 유무를 보고하세요. 압력이 정상 범위(녹색 구간)를 벗어난 경우 즉시 관리자에게 연락하십시오.\n\n점검 항목:\n• 압력 게이지 정상 범위 확인\n• 안전핀 이탈 여부 확인\n• 소화기 외관 손상 여부 확인\n• 점검 라벨 부착 여부 확인',
    assigneeId: 'staff-1',
    assignedByName: '박관리',
    location: '1층 로비',
    priority: 'high',
    status: 'todo',
    deadline: todayAt(14),
    repeatType: 'none',
    attachmentName: '소화기_점검표.jpg',
    attachmentSize: '245 KB',
    createdAt: daysAgoAt(1, 9),
    updatedAt: daysAgoAt(1, 9),
  },
  {
    id: '2',
    title: '지하 1층 청소',
    description:
      '지하 1층 주차장 및 복도 전체 청소를 진행해 주세요. 청소 후 반드시 사진 촬영하여 보고서에 첨부하십시오.\n\n청소 범위:\n• B1 주차장 전 구역 바닥 청소\n• 엘리베이터 홀 및 복도\n• 비상계단 입구',
    assigneeId: 'staff-1',
    assignedByName: '박관리',
    location: '지하 1층',
    priority: 'medium',
    status: 'in_progress',
    deadline: todayAt(18),
    repeatType: 'daily',
    createdAt: daysAgoAt(1, 8),
    updatedAt: daysAgoAt(1, 8),
  },
  {
    id: '3',
    title: '3층 복도 전구 교체',
    description:
      '3층 복도 304~308호 앞 천장 형광등 2개 교체. 창고(B2-03)에서 예비 전구(FL32W)를 가져와서 교체 후 폐기물은 분리수거함에 처리하십시오.',
    assigneeId: 'staff-1',
    assignedByName: '이어드민',
    location: '3층 복도',
    priority: 'low',
    status: 'todo',
    deadline: tomorrowAt(10),
    repeatType: 'none',
    createdAt: daysAgoAt(1, 14),
    updatedAt: daysAgoAt(1, 14),
  },
  {
    id: '4',
    title: '옥상 배수구 점검',
    description:
      '전날 강우로 인한 옥상 배수구 막힘 여부를 점검하고 이물질을 제거하세요.\n\n점검 항목:\n• 배수구 이물질(낙엽, 쓰레기) 제거\n• 배수 흐름 정상 여부 확인\n• 방수층 손상 여부 육안 확인',
    assigneeId: 'staff-1',
    assignedByName: '박관리',
    location: '옥상',
    priority: 'high',
    status: 'in_progress',
    deadline: todayAt(16),
    repeatType: 'none',
    createdAt: daysAgoAt(1, 7),
    updatedAt: daysAgoAt(1, 7),
  },
  {
    id: '5',
    title: '주차장 CCTV 확인',
    description:
      '지하 주차장 CCTV 8대 영상 녹화 정상 여부 확인 및 사각지대 점검. 이상이 있는 경우 카메라 번호와 증상을 기록하여 보고하십시오.',
    assigneeId: 'staff-1',
    assignedByName: '이어드민',
    location: '지하 주차장',
    priority: 'medium',
    status: 'done',
    deadline: tomorrowAt(9),
    repeatType: 'none',
    createdAt: daysAgoAt(2, 10),
    updatedAt: daysAgoAt(2, 10),
  },
];

export const DUMMY_CURRENT_USER = {
  id: 'staff-1',
  name: '홍길동',
  jobType: 'maintenance' as const,
};
