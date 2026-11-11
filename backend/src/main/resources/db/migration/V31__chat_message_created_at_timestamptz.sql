-- 다른 테이블과 맞추어 대화 기록 시각을 시간대가 있는 타입으로 바꾼다(기존 값은 DB 시간대로 해석한다).
ALTER TABLE chat_message ALTER COLUMN created_at TYPE TIMESTAMPTZ;
ALTER TABLE chat_message ALTER COLUMN created_at SET DEFAULT now();
