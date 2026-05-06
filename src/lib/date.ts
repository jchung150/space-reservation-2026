const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function getFullDateTimeLabel(isoDate: string): string {
  const d = new Date(isoDate);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${hh}:${mm}`;
}

export function getDateOnlyLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function getTodayLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${DAYS_KO[now.getDay()]})`;
}

/** 관리자 테이블용: 오늘/내일/모레/MM/DD */
export function getAdminDueLabel(isoDate: string): string {
  const due = new Date(isoDate);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart   = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays   = Math.round((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  const hh = String(due.getHours()).padStart(2, '0');
  const mm = String(due.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  if (diffDays === 0)  return `오늘 ${time}`;
  if (diffDays === 1)  return `내일 ${time}`;
  if (diffDays === 2)  return `모레 ${time}`;
  if (diffDays === -1) return `어제 ${time}`;
  return `${String(due.getMonth() + 1).padStart(2, '0')}/${String(due.getDate()).padStart(2, '0')}`;
}

export function getDueLabel(isoDate: string): string {
  const due = new Date(isoDate);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

  const hh = String(due.getHours()).padStart(2, '0');
  const mm = String(due.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;

  if (diffDays === 0) return `오늘 ${time}`;
  if (diffDays === 1) return `내일 ${time}`;
  if (diffDays === -1) return `어제 ${time}`;
  return `${due.getMonth() + 1}월 ${due.getDate()}일 ${time}`;
}
