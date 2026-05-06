-- ============================================================
-- 20260501000001: 복수 직군 + 슈퍼 관리자
-- ============================================================

-- ── 1. 관리자 역할 enum ──────────────────────────────────────
CREATE TYPE admin_role AS ENUM ('super', 'admin');

-- ── 2. admins 테이블에 role 컬럼 추가 ───────────────────────
ALTER TABLE admins
  ADD COLUMN role admin_role NOT NULL DEFAULT 'admin';

-- admin01(박관리)을 슈퍼 관리자로 지정
UPDATE admins SET role = 'super' WHERE login_id = 'admin01';

-- ── 3. staff: job_type(단일) → job_types(배열) ───────────────
-- 3-1. 새 배열 컬럼 추가
ALTER TABLE staff
  ADD COLUMN job_types job_type[] NOT NULL DEFAULT '{}';

-- 3-2. 기존 데이터 마이그레이션 (단일값 → 배열)
UPDATE staff SET job_types = ARRAY[job_type];

-- 3-3. 기존 컬럼 제거 (데이터 확인 후 실행)
ALTER TABLE staff DROP COLUMN job_type;

-- 3-4. GIN 인덱스 (배열 포함 검색용)
CREATE INDEX idx_staff_job_types ON staff USING GIN (job_types);

-- ── 확인 쿼리 ───────────────────────────────────────────────
SELECT name, job_types, login_id FROM staff ORDER BY name;
SELECT name, role, login_id      FROM admins ORDER BY role DESC, name;
