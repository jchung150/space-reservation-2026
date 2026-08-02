export type Priority   = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'pending_review' | 'done' | 'rework';
export type JobType    = 'security' | 'cleaning' | 'maintenance';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type AdminRole  = 'super' | 'admin';

export const BUILDING_TYPE_OPTIONS = [
  '오피스',
  '리테일/상업시설',
  '주거시설',
  '산업·물류시설',
  '호텔·숙박시설',
  '의료시설',
  '교육시설',
  '복합시설',
  '특수시설',
] as const;
export type BuildingType = typeof BUILDING_TYPE_OPTIONS[number];

export interface Building {
  id:            string;
  name:          string;
  buildingTypes: BuildingType[];
  address:       string | null;
  builtAt:       string | null;   // ISO date (YYYY-MM-DD)
  approvedAt:    string | null;
  thumbnailPath: string | null;
  thumbnailUrl:  string | null;   // 서명 URL (조회 시 API가 채움)
  sortOrder:     number;
  isActive:      boolean;
  createdAt:     string;
}

export interface TaskType {
  id:        string;
  name:      string;
  jobType:   JobType;
  sortOrder: number;
  isActive:  boolean;
  createdAt: string;
}

export interface Staff {
  id:        string;
  name:      string;
  loginId:   string;
  jobTypes:  JobType[];   // 복수 직군 지원
  phone?:    string;
  isActive:  boolean;
  joinedAt:  string;
  createdAt: string;
}

export interface Task {
  id:              string;
  title:           string;
  description:     string;
  assigneeId:      string;
  assignee?:       Pick<Staff, 'id' | 'name' | 'jobTypes'>;
  assignedByName?: string;
  taskJobType?:    JobType | null; // 업무 생성 시 선택한 직군
  taskTypeId?:     string | null;
  taskTypeName?:   string | null;
  buildingId?:     string | null;
  buildingName?:   string | null;
  location:        string;
  priority:        Priority;
  status:          TaskStatus;
  deadline:        string;
  repeatType:      RepeatType;
  repeatDays?:     number[] | null;
  repeatDate?:     number  | null;
  reworkReason?:   string;
  attachmentName?:  string;
  attachmentSize?:  string;
  referenceImages?: string[]; // 서명된 URL 배열
  createdAt:        string;
  updatedAt:        string;
}

export interface AdminTask extends Task {
  employeeName: string;
  dept:         string;   // 표시용 (예: '보안·청소')
  jobTypes:     JobType[]; // 원본 배열
}

export interface Report {
  id:            string;
  taskId:        string;
  task?:         Task;
  submittedById: string;
  submittedBy?:  Pick<Staff, 'id' | 'name'>;
  memo:          string;
  photoUrls:     string[];
  status:        'pending' | 'approved' | 'rejected';
  rejectReason?: string;
  reviewedById?: string;
  reviewedAt?:   string;
  createdAt:     string;
}

export interface TaskCreateInput {
  title:        string;
  description:  string;
  assigneeId:   string;
  taskJobType?: string; // 업무 생성 시 선택한 직군 (배정 직군 통계용)
  taskTypeId:   string;
  buildingId:   string;
  location:     string;
  priority:     Priority;
  deadline:    string;
  repeatType:  RepeatType;
  repeatDays?:       number[];
  repeatDate?:       number;
  referenceImages?:  string[];
}

export type TaskUpdateInput = Partial<Omit<TaskCreateInput, 'buildingId' | 'taskTypeId'>> & {
  buildingId?: string;
  taskTypeId?: string;
  status?: TaskStatus;
  reworkReason?: string;
};
