-- ============================================================
-- 시설 인력 관리 앱 — 초기 스키마
-- 20260430000001_initial_schema.sql
-- ============================================================

-- ── Extensions ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt()

-- ============================================================
-- 1. ENUM 타입
-- ============================================================

CREATE TYPE job_type AS ENUM (
  'security',     -- 보안 경비
  'cleaning',     -- 청소
  'maintenance'   -- 시설유지보수
);

CREATE TYPE priority_level AS ENUM (
  'high',
  'medium',
  'low'
);

CREATE TYPE task_status AS ENUM (
  'todo',            -- 미완료
  'in_progress',     -- 진행 중
  'pending_review',  -- 완료 대기 (관리자 검토 중)
  'done',            -- 완료
  'rework'           -- 재작업 필요
);

CREATE TYPE repeat_type AS ENUM (
  'none',
  'daily',
  'weekly',
  'monthly'
);

CREATE TYPE report_status AS ENUM (
  'pending',   -- 검토 대기
  'approved',  -- 승인
  'rejected'   -- 반려
);

-- ============================================================
-- 2. updated_at 자동 갱신 트리거 함수
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. 관리자 (admins)
-- ============================================================
-- CLAUDE.md: 복수 관리자 지원, 모든 관리자 동일 권한

CREATE TABLE admins (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  login_id      text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  phone         text,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  admins            IS '관리자 계정';
COMMENT ON COLUMN admins.login_id   IS '로그인 아이디 (고유)';
COMMENT ON COLUMN admins.password_hash IS 'pgcrypto crypt() 해시';

-- ============================================================
-- 4. 현장 직원 (staff)
-- ============================================================

CREATE TABLE staff (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  login_id      text        NOT NULL UNIQUE,
  password_hash text        NOT NULL,
  job_type      job_type    NOT NULL,
  phone         text,
  is_active     boolean     NOT NULL DEFAULT true,
  joined_at     date        NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  staff          IS '현장 직원 (보안/청소/시설유지보수)';
COMMENT ON COLUMN staff.job_type IS 'security | cleaning | maintenance';
COMMENT ON COLUMN staff.joined_at IS '입사일';

-- ============================================================
-- 5. 업무 (tasks)
-- ============================================================

CREATE TABLE tasks (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text           NOT NULL,
  description     text           NOT NULL DEFAULT '',
  assignee_id     uuid           NOT NULL REFERENCES staff(id),
  created_by_id   uuid           NOT NULL REFERENCES admins(id),
  location        text           NOT NULL DEFAULT '',
  priority        priority_level NOT NULL DEFAULT 'medium',
  status          task_status    NOT NULL DEFAULT 'todo',
  deadline        timestamptz    NOT NULL,

  -- 반복 설정
  repeat_type     repeat_type    NOT NULL DEFAULT 'none',
  -- weekly: 0=일 1=월 2=화 3=수 4=목 5=금 6=토 (중복 가능)
  repeat_days     integer[]      CHECK (repeat_type = 'weekly' OR repeat_days IS NULL),
  -- monthly: 1~31일
  repeat_date     smallint       CHECK (
                                   repeat_date IS NULL
                                   OR (repeat_date BETWEEN 1 AND 31
                                       AND repeat_type = 'monthly')
                                 ),
  -- 반복 업무의 원본 태스크 ID (인스턴스 추적용)
  parent_task_id  uuid           REFERENCES tasks(id) ON DELETE SET NULL,

  -- 재작업 사유 (status = rework 일 때만 값 존재)
  rework_reason   text           CHECK (status != 'rework' OR rework_reason IS NOT NULL),

  -- 아카이브 (완료 확정된 업무 이관)
  is_archived     boolean        NOT NULL DEFAULT false,
  archived_at     timestamptz,

  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  tasks                IS '업무 단위';
COMMENT ON COLUMN tasks.repeat_days    IS 'weekly 반복 시 요일 배열 (0=일~6=토)';
COMMENT ON COLUMN tasks.repeat_date    IS 'monthly 반복 시 일자 (1~31)';
COMMENT ON COLUMN tasks.parent_task_id IS '반복 생성된 인스턴스의 원본 업무 ID';
COMMENT ON COLUMN tasks.is_archived    IS '완료 확정 후 아카이브 이관 여부';

-- ============================================================
-- 6. 업무 첨부 자료 (task_attachments)
-- ============================================================
-- 관리자가 업무 생성 시 첨부하는 참고 자료 (사진/PDF/문서)

CREATE TABLE task_attachments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name       text        NOT NULL,
  storage_path    text        NOT NULL,  -- Supabase Storage 경로
  file_size_bytes bigint      CHECK (file_size_bytes > 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  task_attachments              IS '업무 참고 자료 (관리자 첨부)';
COMMENT ON COLUMN task_attachments.storage_path IS 'Supabase Storage bucket 내 경로';

-- ============================================================
-- 7. 완료 보고 (reports)
-- ============================================================
-- CLAUDE.md: 사진(최대 5장) + 메모(10~500자) 제출

CREATE TABLE reports (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id           uuid          NOT NULL REFERENCES tasks(id),
  submitted_by_id   uuid          NOT NULL REFERENCES staff(id),

  -- 메모: 10자 이상 500자 이하
  memo              text          NOT NULL
                      CHECK (char_length(memo) BETWEEN 10 AND 500),

  status            report_status NOT NULL DEFAULT 'pending',

  -- 반려 사유 (rejected 시 필수)
  reject_reason     text
                      CHECK (status != 'rejected' OR reject_reason IS NOT NULL),

  -- 검토자 정보 (pending 아닐 때 필수)
  reviewed_by_id    uuid          REFERENCES admins(id),
  reviewed_at       timestamptz,

  CONSTRAINT review_meta_required CHECK (
    status = 'pending'
    OR (reviewed_by_id IS NOT NULL AND reviewed_at IS NOT NULL)
  ),

  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  reports             IS '직원이 제출한 완료 보고';
COMMENT ON COLUMN reports.memo        IS '완료 메모 (10~500자)';
COMMENT ON COLUMN reports.status      IS 'pending → approved | rejected';

-- ============================================================
-- 8. 보고 사진 (report_photos)
-- ============================================================
-- 최대 5장 제한은 애플리케이션 레이어에서 강제

CREATE TABLE report_photos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       uuid        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  storage_path    text        NOT NULL,  -- Supabase Storage 경로
  file_name       text        NOT NULL,
  file_size_bytes bigint      CHECK (file_size_bytes > 0),
  sort_order      smallint    NOT NULL DEFAULT 0,  -- 0~4 (표시 순서)
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  report_photos              IS '완료 보고 첨부 사진 (최대 5장)';
COMMENT ON COLUMN report_photos.storage_path IS 'Supabase Storage bucket 내 경로';
COMMENT ON COLUMN report_photos.sort_order   IS '사진 표시 순서 (0부터 시작)';

-- ============================================================
-- 9. 인덱스
-- ============================================================

-- tasks
CREATE INDEX idx_tasks_assignee_id   ON tasks(assignee_id);
CREATE INDEX idx_tasks_created_by    ON tasks(created_by_id);
CREATE INDEX idx_tasks_status        ON tasks(status);
CREATE INDEX idx_tasks_deadline      ON tasks(deadline);
CREATE INDEX idx_tasks_is_archived   ON tasks(is_archived) WHERE is_archived = true;
CREATE INDEX idx_tasks_parent        ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;

-- reports
CREATE INDEX idx_reports_task_id        ON reports(task_id);
CREATE INDEX idx_reports_submitted_by   ON reports(submitted_by_id);
CREATE INDEX idx_reports_status         ON reports(status);
CREATE INDEX idx_reports_created_at     ON reports(created_at DESC);
CREATE INDEX idx_reports_reviewed_by    ON reports(reviewed_by_id) WHERE reviewed_by_id IS NOT NULL;

-- report_photos
CREATE INDEX idx_report_photos_report   ON report_photos(report_id, sort_order);

-- task_attachments
CREATE INDEX idx_task_attachments_task  ON task_attachments(task_id);
