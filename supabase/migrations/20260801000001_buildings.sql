-- ============================================================
-- 건물 마스터 데이터
-- ============================================================

CREATE TABLE buildings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  sort_order integer     NOT NULL DEFAULT 0,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE  buildings           IS '업무가 수행되는 건물 마스터';
COMMENT ON COLUMN buildings.is_active IS 'false 시 신규 업무 배정 불가 (기존 이력은 유지)';

-- 초기 5개 건물
INSERT INTO buildings (name, sort_order) VALUES
  ('영준빌딩',   10),
  ('금악빌딩',   20),
  ('기쁨의집',   30),
  ('주안하우스', 40),
  ('책이좋은집', 50);

-- ============================================================
-- tasks.building_id (FK)
-- 삭제 정책: RESTRICT — 사용 중인 건물은 삭제 불가 (API에서도 사전 차단)
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN building_id uuid REFERENCES buildings(id) ON DELETE RESTRICT;

CREATE INDEX idx_tasks_building_id ON tasks(building_id);

COMMENT ON COLUMN tasks.building_id IS '업무가 수행되는 건물 (buildings.id)';
