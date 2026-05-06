import type { Priority, TaskStatus } from '@/types';

/* ── 업무 아카이브 (SCR-A08) ─────────────────────────────────────── */
export interface ArchiveItem {
  id: string;
  name: string;
  employee: string;
  dept: '보안' | '청소' | '시설';
  priority: Priority;
  completedAt: string;          // 표시용 '04/24 13:42'
  duration: string;             // '1.2시간'
  reviewer: string;             // '관리자1'
  memo: string;
  photoColors: [string, string]; // 상세 모달 썸네일 색상 2개
}

export const DUMMY_ARCHIVE: ArchiveItem[] = [
  {
    id: 'ar1', name: '1층 로비 소화기 점검', employee: '김보안', dept: '보안', priority: 'high',
    completedAt: '04/24 13:42', duration: '1.2시간', reviewer: '관리자1',
    memo: '점검 완료. 압력 게이지 정상이며 외관 손상 없음. 다음 점검은 다음 달 24일 예정.',
    photoColors: ['oklch(72% 0.09 195)', 'oklch(75% 0.09 145)'],
  },
  {
    id: 'ar2', name: '지하 1층 청소', employee: '이청소', dept: '청소', priority: 'medium',
    completedAt: '04/24 17:55', duration: '3.5시간', reviewer: '관리자1',
    memo: '지하 1층 전 구역 청소 완료. 바닥 물걸레질 및 먼지 제거 완료. 이상 없음.',
    photoColors: ['oklch(75% 0.09 145)', 'oklch(78% 0.08 50)'],
  },
  {
    id: 'ar3', name: '옥상 배수구 청소', employee: '최청소', dept: '청소', priority: 'medium',
    completedAt: '04/23 15:20', duration: '2.1시간', reviewer: '관리자2',
    memo: '배수구 이물질 제거 완료. 배수 정상 확인. 다음 청소는 우기 전 진행 권장.',
    photoColors: ['oklch(78% 0.08 50)', 'oklch(72% 0.09 280)'],
  },
  {
    id: 'ar4', name: '2층 화장실 수도꼭지 수리', employee: '박유지', dept: '시설', priority: 'high',
    completedAt: '04/22 11:05', duration: '4.0시간', reviewer: '관리자1',
    memo: '수도꼭지 패킹 교체 완료. 누수 없음 재확인. 자재 비용 영수증 별도 제출 완료.',
    photoColors: ['oklch(72% 0.09 280)', 'oklch(72% 0.09 195)'],
  },
];

/* ── 아카이브 통계 (하드코딩 — API 연동 시 계산값으로 교체) ────── */
export const ARCHIVE_STATS = {
  total:       37,
  avgDuration: 2.3,
  byDept: [
    { dept: '보안', count: 12 },
    { dept: '청소', count: 15 },
    { dept: '시설', count: 10 },
  ],
} as const;

/* ── 인력 관리 (SCR-A07) ─────────────────────────────────────────── */
export interface StaffMember {
  id: string;
  name: string;
  dept: '보안' | '청소' | '시설';
  phone: string;
  loginId: string;
  active: boolean;
  assigned: number;
  rate: number | null; // 완료율 %, null = 비활성
}

export interface AdminMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  active: boolean;
}

export const DUMMY_STAFF: StaffMember[] = [
  { id: 's1', name: '김보안', dept: '보안', phone: '010-1234-5678', loginId: 'kim_boan',   active: true,  assigned: 8, rate: 75 },
  { id: 's2', name: '이보안', dept: '보안', phone: '010-2345-6789', loginId: 'lee_boan',   active: true,  assigned: 5, rate: 60 },
  { id: 's3', name: '이청소', dept: '청소', phone: '010-3456-7890', loginId: 'lee_clean',  active: true,  assigned: 6, rate: 83 },
  { id: 's4', name: '최청소', dept: '청소', phone: '010-4567-8901', loginId: 'choi_clean', active: false, assigned: 0, rate: null },
  { id: 's5', name: '박유지', dept: '시설', phone: '010-5678-9012', loginId: 'park_yuji',  active: true,  assigned: 7, rate: 71 },
];

export const DUMMY_ADMINS: AdminMember[] = [
  { id: 'adm1', name: '박관리', role: '최고 관리자', phone: '010-1111-2222', active: true },
  { id: 'adm2', name: '이부장', role: '관리자',     phone: '010-3333-4444', active: true },
];

/* ── 직군 컬러 ──────────────────────────────────────────────────── */
export const DEPT_COLOR: Record<string, string> = {
  시설: 'oklch(55% 0.14 195)',
  청소: 'oklch(62% 0.15 160)',
  보안: 'oklch(65% 0.16 65)',
};

/* ── 오늘 마감 업무 ─────────────────────────────────────────────── */
export interface AdminTask {
  id: string;
  title: string;
  employee: string;
  dept: string;
  priority: Priority;
  status: TaskStatus;
}

export const DUMMY_TODAY_TASKS: AdminTask[] = [
  { id: '1', title: '1층 로비 소화기 점검',  employee: '김현장', dept: '시설', priority: 'high',   status: 'todo' },
  { id: '2', title: '지하 1층 주차장 청소',   employee: '이청소', dept: '청소', priority: 'medium', status: 'in_progress' },
  { id: '3', title: '정문 CCTV 녹화 확인',    employee: '박보안', dept: '보안', priority: 'high',   status: 'todo' },
  { id: '4', title: '3층 복도 전구 교체',     employee: '김현장', dept: '시설', priority: 'low',    status: 'in_progress' },
];

/* ── 직원별 이행률 ──────────────────────────────────────────────── */
export interface EmployeeStat {
  name: string;
  dept: string;
  done: number;
  total: number;
}

export const DUMMY_EMPLOYEE_STATS: EmployeeStat[] = [
  { name: '김현장', dept: '시설', done: 8,  total: 10 },
  { name: '이청소', dept: '청소', done: 6,  total: 8  },
  { name: '박보안', dept: '보안', done: 5,  total: 7  },
  { name: '최시설', dept: '시설', done: 9,  total: 11 },
  { name: '정청소', dept: '청소', done: 3,  total: 6  },
];

/* ── 최근 완료 보고 ─────────────────────────────────────────────── */
export interface RecentReport {
  id: string;
  employee: string;
  task: string;
  time: string;
  dept: string;
}

export const DUMMY_RECENT_REPORTS: RecentReport[] = [
  { id: '1', employee: '이청소', task: 'B동 2층 복도 청소', time: '09:32', dept: '청소' },
  { id: '2', employee: '박보안', task: '야간 순찰 보고',     time: '08:15', dept: '보안' },
  { id: '3', employee: '최시설', task: '보일러실 점검',      time: '07:58', dept: '시설' },
];

/* ── KPI 수치 ───────────────────────────────────────────────────── */
export const DUMMY_KPI = {
  total:         42,
  todo:          18,
  pendingReview: 7,
  todayDue:      5,
};

/* ── 사이드바 미검토 보고 수 ───────────────────────────────────── */
export const PENDING_REPORT_COUNT = 7;

/* ── 완료 보고 검토 목록 (SCR-A05) ────────────────────────────── */
export type ReportStatus = 'pending' | 'approved' | 'rejected';

export interface ReportPhoto {
  color: string; // UI-only (API 연동 시 url: string으로 교체)
  label: string;
}

export interface AdminReport {
  id: string;
  employee: string;
  dept: '보안' | '청소' | '시설';
  task: string;
  priority: Priority;
  timeAgo: string;
  status: ReportStatus;
  isNew: boolean;
  photoColor: string;    // 목록 카드용 썸네일 색상
  photos: ReportPhoto[]; // 상세 갤러리용
  memo: string;
  // 원본 업무 정보 (상세 화면용)
  taskDescription?: string;
  taskDue?: string;        // 표시용 문자열 e.g. "2026년 4월 30일 14:00"
  taskAssignedAt?: string; // 표시용 문자열 e.g. "2026년 4월 28일"
}

const PHOTO_COLORS = [
  'oklch(72% 0.09 195)',
  'oklch(75% 0.09 145)',
  'oklch(78% 0.08 50)',
  'oklch(72% 0.09 280)',
] as const;

export const DUMMY_REPORTS: AdminReport[] = [
  {
    id: 'r1', employee: '김보안', dept: '보안', task: '1층 로비 소화기 점검',
    priority: 'high', timeAgo: '방금 전', status: 'pending', isNew: true,
    photoColor: PHOTO_COLORS[0],
    photos: [
      { color: 'oklch(72% 0.09 195)', label: '소화기 정면' },
      { color: 'oklch(75% 0.09 145)', label: '압력 게이지' },
      { color: 'oklch(78% 0.08 50)',  label: '점검 라벨'   },
    ],
    memo: '1층 로비 소화기 3개 모두 압력 게이지 정상 범위(녹색 구간) 확인 완료하였습니다.\n\n안전핀 이탈 없음, 외관 손상 없음, 점검 라벨 신규 부착 완료.\n\n소화기 위치:\n• 로비 정문 좌측\n• 로비 정문 우측\n• 안내데스크 뒤편\n\n이상 없음.',
    taskDescription: '1층 로비 소화기 3개의 압력 게이지를 확인하고 이상 유무를 보고하세요. 압력이 정상 범위(녹색 구간)를 벗어난 경우 즉시 관리자에게 연락하십시오.',
    taskDue: '2026년 4월 30일 14:00',
    taskAssignedAt: '2026년 4월 28일',
  },
  {
    id: 'r2', employee: '이청소', dept: '청소', task: '지하 1층 청소',
    priority: 'medium', timeAgo: '12분 전', status: 'pending', isNew: false,
    photoColor: PHOTO_COLORS[1],
    photos: [
      { color: 'oklch(75% 0.09 145)', label: '청소 전' },
      { color: 'oklch(72% 0.09 195)', label: '청소 후' },
    ],
    memo: '지하 1층 복도 및 주차장 입구 청소 완료. 바닥 물걸레질 포함.\n이상 없음.',
    taskDescription: '지하 1층 주차장 및 복도 전체 청소를 진행해 주세요. 청소 후 반드시 사진 촬영하여 보고서에 첨부하십시오.',
    taskDue: '2026년 4월 30일 18:00',
    taskAssignedAt: '2026년 4월 28일',
  },
  {
    id: 'r3', employee: '박유지', dept: '시설', task: '2층 화장실 수도꼭지 수리',
    priority: 'high', timeAgo: '34분 전', status: 'pending', isNew: false,
    photoColor: PHOTO_COLORS[2],
    photos: [
      { color: 'oklch(78% 0.08 50)', label: '수리 전' },
      { color: 'oklch(75% 0.09 145)', label: '수리 후' },
    ],
    memo: '2층 남자 화장실 세 번째 수도꼭지 패킹 교체 완료. 누수 없음 확인.',
    taskDescription: '2층 화장실 수도꼭지 누수 수리. 패킹 교체 후 정상 작동 여부를 확인하십시오.',
    taskDue: '2026년 4월 30일 12:00',
    taskAssignedAt: '2026년 4월 29일',
  },
  {
    id: 'r4', employee: '최청소', dept: '청소', task: '옥상 배수구 청소',
    priority: 'medium', timeAgo: '1시간 전', status: 'pending', isNew: false,
    photoColor: PHOTO_COLORS[3],
    photos: [
      { color: 'oklch(72% 0.09 280)', label: '배수구 상태' },
      { color: 'oklch(78% 0.08 50)', label: '청소 완료'  },
    ],
    memo: '옥상 배수구 이물질 제거 완료. 배수 상태 정상 확인.',
    taskDescription: '옥상 배수구 이물질 제거 및 배수 상태 확인. 전날 강우로 인한 막힘 여부를 점검하십시오.',
    taskDue: '2026년 5월 1일 11:00',
    taskAssignedAt: '2026년 4월 29일',
  },
  {
    id: 'r5', employee: '이보안', dept: '보안', task: '주차장 CCTV 확인',
    priority: 'low', timeAgo: '2시간 전', status: 'approved', isNew: false,
    photoColor: PHOTO_COLORS[0],
    photos: [
      { color: 'oklch(72% 0.09 195)', label: 'CCTV 화면' },
    ],
    memo: 'CCTV 8대 모두 정상 녹화 중. 사각지대 없음 확인.',
    taskDescription: '지하 주차장 CCTV 8대 영상 녹화 정상 여부 확인 및 사각지대 점검.',
    taskDue: '2026년 5월 1일 09:00',
    taskAssignedAt: '2026년 4월 29일',
  },
  {
    id: 'r6', employee: '정유지', dept: '시설', task: '엘리베이터 점검',
    priority: 'high', timeAgo: '3시간 전', status: 'rejected', isNew: false,
    photoColor: PHOTO_COLORS[1],
    photos: [
      { color: 'oklch(75% 0.09 145)', label: '엘리베이터 내부' },
    ],
    memo: '1호기 이상 소음 발생. 정밀 점검 필요.',
    taskDescription: '엘리베이터 1~3호기 월간 정기 점검. 소음, 진동, 비상 통화 장치 정상 여부를 확인하십시오.',
    taskDue: '2026년 5월 5일 10:00',
    taskAssignedAt: '2026년 4월 28일',
  },
];

/* SSE 시뮬레이션용 새 보고 후보 */
export const DEMO_INCOMING_REPORTS: Omit<AdminReport, 'id' | 'timeAgo' | 'isNew'>[] = [
  {
    employee: '이보안', dept: '보안', task: '야간 순찰 보고',  priority: 'medium', status: 'pending',
    photoColor: PHOTO_COLORS[0],
    photos: [{ color: PHOTO_COLORS[0], label: '순찰 완료' }],
    memo: '야간 순찰 이상 없음 확인.',
  },
  {
    employee: '정유지', dept: '시설', task: '3층 소화전 점검', priority: 'high', status: 'pending',
    photoColor: PHOTO_COLORS[2],
    photos: [{ color: PHOTO_COLORS[2], label: '소화전 상태' }],
    memo: '3층 소화전 압력 정상 확인.',
  },
];

/* ── 업무 목록 관리용 전체 태스크 (SCR-A03) ────────────────────── */
export interface AdminTaskFull {
  id: string;
  title: string;
  description: string;
  employee: string;
  dept: '보안' | '청소' | '시설';
  priority: Priority;
  deadline: string; // ISO
  status: TaskStatus;
}

function d(offsetDays: number, hour: number, min = 0): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(hour, min, 0, 0);
  return dt.toISOString();
}

export const DUMMY_ADMIN_TASKS: AdminTaskFull[] = [
  { id: 'a1',  title: '1층 로비 소화기 점검',       description: '1층 로비 소화기 3개의 압력 게이지를 확인하고 이상 유무를 보고하세요. 이상 발견 시 즉시 연락하십시오.',                 employee: '김보안', dept: '보안', priority: 'high',   deadline: d(0,  14),    status: 'pending_review' },
  { id: 'a2',  title: '지하 1층 청소',              description: '지하 1층 주차장 및 복도 전체 청소를 진행해 주세요. 청소 후 반드시 사진을 촬영하여 보고서에 첨부하십시오.',              employee: '이청소', dept: '청소', priority: 'medium', deadline: d(0,  18),    status: 'in_progress' },
  { id: 'a3',  title: '3층 복도 전구 교체',         description: '3층 복도 304~308호 앞 천장 형광등 2개 교체. 창고에서 예비 전구를 가져올 것.',                                         employee: '박유지', dept: '시설', priority: 'low',    deadline: d(1,  10),    status: 'rework' },
  { id: 'a4',  title: '주차장 CCTV 점검',           description: '지하 주차장 CCTV 8대 영상 녹화 정상 여부 확인 및 사각지대 점검. 이상 발견 시 카메라 번호와 증상을 기록하여 보고하십시오.', employee: '김보안', dept: '보안', priority: 'high',   deadline: d(2,   9),    status: 'todo' },
  { id: 'a5',  title: '옥상 배수구 청소',           description: '옥상 배수구 이물질 제거 및 배수 상태 확인. 전날 강우로 인한 막힘 여부를 점검하십시오.',                               employee: '최청소', dept: '청소', priority: 'medium', deadline: d(3,  11),    status: 'todo' },
  { id: 'a6',  title: '보일러실 안전 점검',         description: '보일러실 가스 누출 여부, 압력계, 온도계 이상 유무를 점검하고 결과를 보고하십시오.',                                    employee: '박유지', dept: '시설', priority: 'high',   deadline: d(0,  16),    status: 'in_progress' },
  { id: 'a7',  title: '정문 잠금장치 확인',         description: '정문 전자 잠금장치 정상 작동 여부 및 배터리 잔량을 확인하십시오.',                                                    employee: '김보안', dept: '보안', priority: 'medium', deadline: d(1,   8),    status: 'done' },
  { id: 'a8',  title: '엘리베이터 월간 점검',       description: '엘리베이터 1~3호기 월간 정기 점검. 소음, 진동, 비상 통화 장치 정상 여부를 확인하십시오.',                              employee: '박유지', dept: '시설', priority: 'high',   deadline: d(5,  10),    status: 'todo' },
  { id: 'a9',  title: 'B동 복도 청소',              description: 'B동 1~5층 복도 전체 청소. 먼지 제거 및 바닥 물걸레질 후 사진으로 완료를 보고하십시오.',                               employee: '이청소', dept: '청소', priority: 'low',    deadline: d(0,  12),    status: 'done' },
  { id: 'a10', title: '화재감지기 배터리 교체',     description: '전 층 화재감지기 배터리 교체. 교체 후 정상 작동 여부를 테스트하십시오.',                                               employee: '박유지', dept: '시설', priority: 'medium', deadline: d(4,  15),    status: 'todo' },
  { id: 'a11', title: '지하 주차장 CCTV 각도 조정', description: '사각지대 최소화를 위한 CCTV 카메라 각도 조정. 조정 후 모니터에서 화면을 확인하십시오.',                               employee: '김보안', dept: '보안', priority: 'low',    deadline: d(6,  14),    status: 'todo' },
  { id: 'a12', title: '야간 순찰 일지 작성',        description: '야간 순찰 경로와 이상 유무를 순찰 일지에 기록하고 보고하십시오.',                                                     employee: '김보안', dept: '보안', priority: 'medium', deadline: d(-1, 23, 30), status: 'done' },
];
