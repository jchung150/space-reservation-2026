-- ============================================================
-- 업무 유형 마스터 데이터
-- 직군(security/cleaning/maintenance) 하위의 세부 유형
-- ============================================================

CREATE TABLE task_types (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  job_type   text        NOT NULL CHECK (job_type IN ('security', 'cleaning', 'maintenance')),
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_task_types_updated_at
  BEFORE UPDATE ON task_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  task_types           IS '업무 유형 마스터 (직군 하위)';
COMMENT ON COLUMN task_types.job_type  IS '이 유형이 속하는 직군 — 배정 가능 직원 필터에 사용';
COMMENT ON COLUMN task_types.is_active IS 'false 시 신규 업무 배정 불가 (기존 이력은 유지)';

-- 초기 11개 업무 유형
INSERT INTO task_types (name, job_type, sort_order) VALUES
  ('시설',         'maintenance',  10),
  ('기계전기설비', 'maintenance',  20),
  ('소방',         'maintenance',  30),
  ('승강기',       'maintenance',  40),
  ('전기안전',     'maintenance',  50),
  ('보안',         'security',     60),
  ('미화',         'cleaning',     70),
  ('위생',         'cleaning',     80),
  ('주차',         'maintenance',  90),
  ('조경',         'maintenance', 100),
  ('네트워크',     'maintenance', 110);

-- ============================================================
-- tasks.task_type_id (FK)
-- 삭제 정책: RESTRICT — 사용 중인 유형은 삭제 불가
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN task_type_id uuid REFERENCES task_types(id) ON DELETE RESTRICT;

CREATE INDEX idx_tasks_task_type_id ON tasks(task_type_id);

COMMENT ON COLUMN tasks.task_type_id IS '업무 유형 (task_types.id) — 저장 시 task_job_type도 함께 동기화';
