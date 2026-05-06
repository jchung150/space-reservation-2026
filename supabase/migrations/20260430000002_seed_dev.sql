-- ============================================================
-- 개발용 시드 데이터
-- 20260430000002_seed_dev.sql
-- 비밀번호는 모두 'password1234' (bcrypt 해시)
-- ============================================================

-- ── 관리자 ──────────────────────────────────────────────────
INSERT INTO admins (name, login_id, password_hash, phone) VALUES
  ('박관리', 'admin01', crypt('password1234', gen_salt('bf', 10)), '010-1111-2222'),
  ('이부장', 'admin02', crypt('password1234', gen_salt('bf', 10)), '010-3333-4444');

-- ── 현장 직원 ───────────────────────────────────────────────
INSERT INTO staff (name, login_id, password_hash, job_type, phone, joined_at) VALUES
  ('김보안', 'kim_boan',   crypt('password1234', gen_salt('bf', 10)), 'security',    '010-1234-5678', '2024-03-01'),
  ('이보안', 'lee_boan',   crypt('password1234', gen_salt('bf', 10)), 'security',    '010-2345-6789', '2023-09-15'),
  ('이청소', 'lee_clean',  crypt('password1234', gen_salt('bf', 10)), 'cleaning',    '010-3456-7890', '2024-01-10'),
  ('최청소', 'choi_clean', crypt('password1234', gen_salt('bf', 10)), 'cleaning',    '010-4567-8901', '2022-06-20'),
  ('박유지', 'park_yuji',  crypt('password1234', gen_salt('bf', 10)), 'maintenance', '010-5678-9012', '2023-04-05'),
  ('홍길동', 'hong.gildong',crypt('password1234', gen_salt('bf', 10)),'maintenance', '010-9876-5432', '2024-03-15');

-- ── 샘플 업무 ───────────────────────────────────────────────
-- admins / staff ID를 변수로 참조
DO $$
DECLARE
  v_admin1  uuid;
  v_admin2  uuid;
  v_staff1  uuid;  -- 김보안
  v_staff3  uuid;  -- 이청소
  v_staff5  uuid;  -- 박유지
  v_staff6  uuid;  -- 홍길동
BEGIN
  SELECT id INTO v_admin1 FROM admins WHERE login_id = 'admin01';
  SELECT id INTO v_admin2 FROM admins WHERE login_id = 'admin02';
  SELECT id INTO v_staff1 FROM staff  WHERE login_id = 'kim_boan';
  SELECT id INTO v_staff3 FROM staff  WHERE login_id = 'lee_clean';
  SELECT id INTO v_staff5 FROM staff  WHERE login_id = 'park_yuji';
  SELECT id INTO v_staff6 FROM staff  WHERE login_id = 'hong.gildong';

  -- 오늘 마감 업무
  INSERT INTO tasks (title, description, assignee_id, created_by_id, location, priority, status, deadline) VALUES
    (
      '1층 로비 소화기 점검',
      E'1층 로비 소화기 3개의 압력 게이지를 확인하고 이상 유무를 보고하세요.\n\n점검 항목:\n• 압력 게이지 정상 범위 확인\n• 안전핀 이탈 여부 확인\n• 소화기 외관 손상 여부 확인',
      v_staff1, v_admin1, '1층 로비', 'high', 'pending_review',
      now()::date + interval '14 hours'
    ),
    (
      '지하 1층 청소',
      E'지하 1층 주차장 및 복도 전체 청소를 진행해 주세요.\n청소 후 반드시 사진 촬영하여 보고서에 첨부하십시오.',
      v_staff3, v_admin1, '지하 1층', 'medium', 'in_progress',
      now()::date + interval '18 hours'
    ),
    (
      '옥상 배수구 점검',
      '옥상 배수구 이물질 제거 및 배수 상태 확인. 전날 강우로 인한 막힘 여부 점검.',
      v_staff5, v_admin1, '옥상', 'high', 'in_progress',
      now()::date + interval '16 hours'
    );

  -- 내일 마감 업무
  INSERT INTO tasks (title, description, assignee_id, created_by_id, location, priority, status, deadline) VALUES
    (
      '3층 복도 전구 교체',
      '3층 복도 304~308호 앞 천장 형광등 2개 교체. 창고에서 예비 전구(FL32W)를 가져올 것.',
      v_staff5, v_admin1, '3층 복도', 'low', 'todo',
      now()::date + interval '1 day' + interval '10 hours'
    ),
    (
      '주차장 CCTV 확인',
      '지하 주차장 CCTV 8대 영상 녹화 정상 여부 확인 및 사각지대 점검.',
      v_staff1, v_admin2, '지하 주차장', 'medium', 'done',
      now()::date + interval '1 day' + interval '9 hours'
    );

  -- 재작업 필요 업무
  INSERT INTO tasks (
    title, description, assignee_id, created_by_id, location,
    priority, status, deadline, rework_reason
  ) VALUES (
    '엘리베이터 정기 점검',
    '엘리베이터 1~3호기 월간 정기 점검. 소음, 진동, 비상 통화 장치 정상 여부를 확인하십시오.',
    v_staff5, v_admin1, '엘리베이터실', 'high', 'rework',
    now()::date + interval '5 days' + interval '10 hours',
    '사진이 불선명하여 점검 결과를 확인할 수 없습니다. 각 호기별 압력계 클로즈업 사진을 포함하여 재제출해 주세요.'
  );

  -- 반복 업무 (매주 월·수·금)
  INSERT INTO tasks (
    title, description, assignee_id, created_by_id, location,
    priority, status, deadline, repeat_type, repeat_days
  ) VALUES (
    '정문 주변 청소',
    '정문 입구 및 주변 바닥 청소. 쓰레기 수거 및 바닥 물청소 포함.',
    v_staff3, v_admin1, '정문', 'low', 'todo',
    now()::date + interval '1 day' + interval '8 hours',
    'weekly', ARRAY[1, 3, 5]  -- 월, 수, 금
  );

  -- 완료 확정(아카이브) 업무 샘플
  INSERT INTO tasks (
    title, description, assignee_id, created_by_id, location,
    priority, status, deadline, is_archived, archived_at
  ) VALUES
    (
      '보일러실 안전 점검',
      '보일러실 가스 누출 여부, 압력계, 온도계 이상 유무 점검.',
      v_staff5, v_admin1, '보일러실', 'high', 'done',
      now() - interval '6 days',
      true, now() - interval '5 days'
    ),
    (
      'B동 복도 청소',
      'B동 1~5층 복도 전체 청소.',
      v_staff3, v_admin1, 'B동 복도', 'low', 'done',
      now() - interval '4 days',
      true, now() - interval '3 days'
    );
END;
$$;

-- ── 샘플 보고 ───────────────────────────────────────────────
DO $$
DECLARE
  v_admin1      uuid;
  v_task_done   uuid;
  v_staff_clean uuid;
  v_report_id   uuid;
BEGIN
  SELECT id INTO v_admin1      FROM admins WHERE login_id = 'admin01';
  SELECT id INTO v_staff_clean FROM staff  WHERE login_id = 'lee_clean';

  -- '주차장 CCTV 확인' 업무의 완료 보고 (approved)
  SELECT id INTO v_task_done FROM tasks WHERE title = '주차장 CCTV 확인' LIMIT 1;

  INSERT INTO reports (
    task_id, submitted_by_id, memo, status,
    reviewed_by_id, reviewed_at
  ) VALUES (
    v_task_done, v_staff_clean,
    'CCTV 8대 모두 정상 녹화 중 확인. 4번 카메라 각도 미세 조정 완료. 사각지대 없음 확인. 이상 없음.',
    'approved', v_admin1, now() - interval '1 day'
  ) RETURNING id INTO v_report_id;

  -- 보고 사진 (storage_path는 추후 실제 업로드 경로로 교체)
  INSERT INTO report_photos (report_id, storage_path, file_name, file_size_bytes, sort_order) VALUES
    (v_report_id, 'reports/sample/cctv_1.jpg', 'cctv_1.jpg', 245760, 0),
    (v_report_id, 'reports/sample/cctv_2.jpg', 'cctv_2.jpg', 189440, 1);
END;
$$;
