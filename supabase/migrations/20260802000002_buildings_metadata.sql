-- ============================================================
-- 건물 상세 정보 확장 — 구분·주소·건축일·사용승인일·썸네일
-- 기존 5개 건물은 이름만 있으므로 신규 컬럼 모두 NULL 허용
-- ============================================================

ALTER TABLE buildings
  ADD COLUMN building_types  text[],
  ADD COLUMN address         text,
  ADD COLUMN built_at        date,
  ADD COLUMN approved_at     date,
  ADD COLUMN thumbnail_path  text;

-- 건물 구분 값 검증 (여러 개 선택 가능)
-- 허용 값: 오피스, 리테일/상업시설, 주거시설, 산업·물류시설,
--         호텔·숙박시설, 의료시설, 교육시설, 복합시설, 특수시설
ALTER TABLE buildings
  ADD CONSTRAINT buildings_building_types_valid CHECK (
    building_types IS NULL
    OR building_types <@ ARRAY[
      '오피스',
      '리테일/상업시설',
      '주거시설',
      '산업·물류시설',
      '호텔·숙박시설',
      '의료시설',
      '교육시설',
      '복합시설',
      '특수시설'
    ]::text[]
  );

COMMENT ON COLUMN buildings.building_types IS '건물 구분 (다중 선택). 하드코딩된 9개 유형 중 선택';
COMMENT ON COLUMN buildings.address        IS '건물 주소 (한 줄 텍스트)';
COMMENT ON COLUMN buildings.built_at       IS '건축일';
COMMENT ON COLUMN buildings.approved_at    IS '사용승인일';
COMMENT ON COLUMN buildings.thumbnail_path IS 'building-thumbnails 버킷 내 저장 경로';
