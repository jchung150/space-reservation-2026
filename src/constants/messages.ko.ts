// 시설 인력 관리 앱 — 한국어 UI 텍스트 상수
// 모든 UI 표시 문자열은 이 파일에서 관리한다.

/* ── 공통 ────────────────────────────────────────────────────────── */
export const COMMON = {
  confirm: '확인',
  cancel: '취소',
  save: '저장',
  edit: '수정',
  delete: '삭제',
  close: '닫기',
  back: '뒤로',
  loading: '불러오는 중...',
  submitting: '제출 중...',
  saving: '저장 중...',
  retry: '다시 시도',
  required: '필수 항목입니다.',
  unknownError: '오류가 발생했습니다. 다시 시도해 주세요.',
} as const;

/* ── 인증 ────────────────────────────────────────────────────────── */
export const AUTH = {
  loginTitle: '로그인',
  employeeId: '직원 번호',
  employeeIdPlaceholder: '직원 번호를 입력하세요',
  password: '비밀번호',
  passwordPlaceholder: '비밀번호를 입력하세요',
  loginButton: '로그인',
  logoutButton: '로그아웃',
  loginError: '직원 번호 또는 비밀번호가 올바르지 않습니다.',
  sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  adminLoginTitle: '관리자 로그인',
} as const;

/* ── 업무 상태 ───────────────────────────────────────────────────── */
export const TASK_STATUS = {
  todo: '미완료',
  inProgress: '진행 중',
  pendingReview: '검토 대기',
  done: '완료',
  rework: '재작업',
} as const;

/* ── 업무 우선순위 ───────────────────────────────────────────────── */
export const PRIORITY = {
  high: '높음',
  medium: '보통',
  low: '낮음',
} as const;

/* ── 직군 ────────────────────────────────────────────────────────── */
export const JOB_TYPE = {
  security: '보안 경비',
  cleaning: '청소',
  maintenance: '시설유지보수',
} as const;

/* ── 네비게이션 (직원) ───────────────────────────────────────────── */
export const NAV_EMPLOYEE = {
  home: '업무',
  calendar: '캘린더',
  profile: '내 정보',
} as const;

/* ── 네비게이션 (관리자) ─────────────────────────────────────────── */
export const NAV_ADMIN = {
  dashboard: '대시보드',
  tasks: '업무 관리',
  reports: '보고 검토',
  staff: '인력 관리',
  archive: '아카이브',
} as const;

/* ── 업무 목록 (SCR-E02) ─────────────────────────────────────────── */
export const TASK_LIST = {
  title: '내 업무',
  emptyTitle: '배정된 업무가 없습니다',
  emptyDescription: '오늘 배정된 업무가 없습니다.',
  filterAll: '전체',
  filterTodo: '미완료',
  filterInProgress: '진행 중',
  sortByPriority: '우선순위순',
  sortByDeadline: '마감일순',
  deadline: '마감',
  location: '위치',
  startTask: '업무 시작',
  viewDetail: '상세 보기',
} as const;

/* ── 업무 상세 (SCR-E04) ─────────────────────────────────────────── */
export const TASK_DETAIL = {
  title: '업무 상세',
  description: '업무 내용',
  assignee: '담당자',
  deadline: '마감 일시',
  location: '위치',
  priority: '우선순위',
  status: '상태',
  startButton: '업무 시작',
  reportButton: '완료 보고 제출',
  reworkNote: '재작업 사유',
} as const;

/* ── 완료 보고 입력 (SCR-E05) ───────────────────────────────────── */
export const REPORT_INPUT = {
  title: '완료 보고',
  photoLabel: '현장 사진',
  photoHint: '사진을 추가하세요 (최대 5장, 장당 최대 10MB)',
  photoAddButton: '사진 추가',
  photoCount: (current: number, max: number) => `${current} / ${max}장`,
  memoLabel: '완료 메모',
  memoPlaceholder: '업무 완료 내용을 입력하세요 (10~500자)',
  memoCount: (current: number) => `${current}자`,
  memoMinError: '메모는 최소 10자 이상 입력해 주세요.',
  memoMaxError: '메모는 최대 500자까지 입력할 수 있습니다.',
  submitButton: '보고 제출',
  photoError: {
    maxCount: '사진은 최대 5장까지 첨부할 수 있습니다.',
    maxSize: '파일 크기는 10MB를 초과할 수 없습니다.',
    invalidType: 'JPG, PNG, HEIC 형식의 파일만 업로드할 수 있습니다.',
  },
  uploadProgress: (percent: number) => `업로드 중... ${percent}%`,
} as const;

/* ── 제출 확인 (SCR-E06) ─────────────────────────────────────────── */
export const REPORT_CONFIRM = {
  title: '보고 제출 완료',
  message: '완료 보고가 제출되었습니다.\n관리자 검토 후 최종 완료 처리됩니다.',
  backToList: '업무 목록으로',
} as const;

/* ── 캘린더 (SCR-E03) ───────────────────────────────────────────── */
export const CALENDAR = {
  title: '캘린더',
  weekView: '주간',
  monthView: '월간',
  today: '오늘',
  noTaskOnDate: '해당 날짜에 업무가 없습니다.',
} as const;

/* ── 관리자 대시보드 (SCR-A02) ──────────────────────────────────── */
export const DASHBOARD = {
  title: '대시보드',
  totalTasks: '전체 업무',
  pendingReview: '검토 대기',
  inProgress: '진행 중',
  completedToday: '오늘 완료',
  liveLabel: 'LIVE',
  liveConnected: '실시간 연결됨',
  liveDisconnected: '연결 끊김',
  recentReports: '최근 보고',
} as const;

/* ── 업무 관리 (SCR-A03) ─────────────────────────────────────────── */
export const TASK_MANAGEMENT = {
  title: '업무 관리',
  createButton: '업무 생성',
  searchPlaceholder: '업무명, 담당자 검색',
  filterAll: '전체',
} as const;

/* ── 업무 생성·편집 (SCR-A04) ───────────────────────────────────── */
export const TASK_FORM = {
  createTitle: '업무 생성',
  editTitle: '업무 수정',
  titleLabel: '업무명',
  titlePlaceholder: '업무명을 입력하세요',
  descriptionLabel: '업무 내용',
  descriptionPlaceholder: '업무 내용을 자세히 입력하세요',
  assigneeLabel: '담당자',
  assigneePlaceholder: '담당자를 선택하세요',
  locationLabel: '위치',
  locationPlaceholder: '위치를 입력하세요',
  priorityLabel: '우선순위',
  deadlineLabel: '마감 일시',
  repeatLabel: '반복 설정',
  repeatNone: '반복 없음',
  repeatDaily: '매일',
  repeatWeekly: '매주',
  repeatMonthly: '매월',
  createButton: '업무 생성',
  saveButton: '저장',
} as const;

/* ── 보고 검토 (SCR-A05 / SCR-A06) ─────────────────────────────── */
export const REPORT_REVIEW = {
  listTitle: '보고 검토',
  detailTitle: '보고 상세',
  approveButton: '승인',
  rejectButton: '반려',
  rejectReasonLabel: '반려 사유',
  rejectReasonPlaceholder: '반려 사유를 입력하세요',
  rejectReasonRequired: '반려 사유를 입력해 주세요.',
  approveConfirm: '이 보고를 승인하시겠습니까?',
  rejectConfirm: '이 보고를 반려하시겠습니까?',
  submittedAt: '제출 일시',
  reviewer: '검토자',
  reviewedAt: '검토 일시',
  photos: '첨부 사진',
  memo: '완료 메모',
} as const;

/* ── 인력 관리 (SCR-A07) ─────────────────────────────────────────── */
export const STAFF = {
  title: '인력 관리',
  createButton: '직원 등록',
  nameLabel: '이름',
  namePlaceholder: '이름을 입력하세요',
  employeeIdLabel: '직원 번호',
  employeeIdPlaceholder: '직원 번호를 입력하세요',
  jobTypeLabel: '직군',
  phoneLabel: '연락처',
  phonePlaceholder: '연락처를 입력하세요',
  passwordLabel: '비밀번호',
  passwordPlaceholder: '초기 비밀번호를 설정하세요',
  editButton: '수정',
  deleteButton: '삭제',
  deleteConfirm: '이 직원을 삭제하시겠습니까?',
} as const;

/* ── 아카이브 (SCR-A08) ─────────────────────────────────────────── */
export const ARCHIVE = {
  title: '업무 아카이브',
  searchPlaceholder: '업무명, 담당자 검색',
  dateFrom: '시작일',
  dateTo: '종료일',
  empty: '검색 결과가 없습니다.',
} as const;

/* ── 날짜·시간 형식 유틸 ─────────────────────────────────────────── */
export const DATE_FORMAT = {
  full: (date: Date) =>
    `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`,
  time: (date: Date) =>
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  fullWithTime: (date: Date) =>
    `${DATE_FORMAT.full(date)} ${DATE_FORMAT.time(date)}`,
} as const;
