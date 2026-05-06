-- ============================================================
-- 20260501000002: 인력 삭제 시 연관 데이터 처리 규칙
--
-- 직원(staff) 삭제 시:
--   tasks.assignee_id      → CASCADE  (배정 업무 함께 삭제)
--   reports.submitted_by_id → CASCADE  (완료 보고 함께 삭제)
--
-- 관리자(admins) 삭제 시:
--   tasks.created_by_id    → SET NULL (업무는 남기고 생성자만 NULL)
--   reports.reviewed_by_id → SET NULL (보고는 남기고 검토자만 NULL)
-- ============================================================

-- ── tasks.assignee_id: NO ACTION → CASCADE ───────────────────
ALTER TABLE tasks
  DROP CONSTRAINT tasks_assignee_id_fkey,
  ADD  CONSTRAINT tasks_assignee_id_fkey
    FOREIGN KEY (assignee_id) REFERENCES staff(id) ON DELETE CASCADE;

-- ── tasks.created_by_id: NOT NULL 해제 + NO ACTION → SET NULL ─
ALTER TABLE tasks
  ALTER COLUMN created_by_id DROP NOT NULL;

ALTER TABLE tasks
  DROP CONSTRAINT tasks_created_by_id_fkey,
  ADD  CONSTRAINT tasks_created_by_id_fkey
    FOREIGN KEY (created_by_id) REFERENCES admins(id) ON DELETE SET NULL;

-- ── reports.submitted_by_id: NO ACTION → CASCADE ─────────────
ALTER TABLE reports
  DROP CONSTRAINT reports_submitted_by_id_fkey,
  ADD  CONSTRAINT reports_submitted_by_id_fkey
    FOREIGN KEY (submitted_by_id) REFERENCES staff(id) ON DELETE CASCADE;

-- ── reports.reviewed_by_id: NO ACTION → SET NULL ─────────────
-- (이미 NULL 허용이므로 제약 조건만 변경)
ALTER TABLE reports
  DROP CONSTRAINT reports_reviewed_by_id_fkey,
  ADD  CONSTRAINT reports_reviewed_by_id_fkey
    FOREIGN KEY (reviewed_by_id) REFERENCES admins(id) ON DELETE SET NULL;

-- ── 변경 확인 ────────────────────────────────────────────────
SELECT
  tc.table_name,
  kcu.column_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('tasks', 'reports')
ORDER BY tc.table_name, kcu.column_name;
