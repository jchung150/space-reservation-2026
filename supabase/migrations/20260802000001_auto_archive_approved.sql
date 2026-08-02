-- ============================================================
-- 승인 후 자동 아카이브 전환 — 정합성 마이그레이션
-- 기존 "승인됐지만 아카이브되지 않은" 업무를 일괄 아카이브 처리
-- ============================================================

UPDATE tasks
SET    is_archived = true,
       status      = 'done'
WHERE  is_archived = false
  AND  id IN (
    SELECT DISTINCT task_id
    FROM   reports
    WHERE  status = 'approved'
  );
