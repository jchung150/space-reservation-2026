import type { AdminTask, Task } from '@/types';

const DEPT_MAP: Record<string, string> = {
  security:    '보안',
  cleaning:    '청소',
  maintenance: '시설',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapTask(row: any): Task {
  return {
    id:              row.id,
    title:           row.title,
    description:     row.description,
    assigneeId:      row.assignee_id,
    assignedByName:  row.admins?.name ?? null,
    location:        row.location,
    taskJobType:     row.task_job_type ?? null,
    taskTypeId:      row.task_type_id ?? null,
    taskTypeName:    row.task_types?.name ?? null,
    buildingId:      row.building_id ?? null,
    buildingName:    row.buildings?.name ?? null,
    priority:        row.priority,
    status:          row.status,
    deadline:        row.deadline,
    repeatType:      row.repeat_type,
    repeatDays:      row.repeat_days  ?? null,
    repeatDate:      row.repeat_date  ?? null,
    reworkReason:    row.rework_reason ?? null,
    referenceImages: row.reference_images ?? [],
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAdminTask(row: any): AdminTask {
  const jobTypes: string[] = row.staff?.job_types ?? [];

  // 배정 직군(task_job_type)이 있으면 그것만 표시
  // 없으면(구 데이터) 직원 대표 직군으로 fallback
  const dept = row.task_job_type
    ? (DEPT_MAP[row.task_job_type] ?? '—')
    : (jobTypes.map((jt: string) => DEPT_MAP[jt] ?? jt)[0] ?? '—');

  return {
    ...mapTask(row),
    employeeName: row.staff?.name ?? '',
    dept,
    jobTypes: jobTypes as AdminTask['jobTypes'],
  };
}
