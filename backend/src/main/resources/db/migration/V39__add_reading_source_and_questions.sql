-- 독해(READING) 단계를 "지문 + 이해 문제"로 바꾼다. 지문은 일본어 위키백과(CC BY-SA 4.0)에서 가져오므로
-- 출처 표시에 필요한 컬럼을 추가하고, 번역은 더 이상 필수가 아니다.
ALTER TABLE theme_reading_passage
    ADD COLUMN source_title VARCHAR(200),
    ADD COLUMN source_url VARCHAR(500),
    ADD COLUMN license VARCHAR(100),
    ADD COLUMN is_excerpt BOOLEAN NOT NULL DEFAULT false,
    ALTER COLUMN translation DROP NOT NULL;

CREATE TABLE theme_reading_question (
    id BIGSERIAL PRIMARY KEY,
    passage_id BIGINT NOT NULL REFERENCES theme_reading_passage (id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    choice_1 TEXT NOT NULL,
    choice_2 TEXT NOT NULL,
    choice_3 TEXT NOT NULL,
    choice_4 TEXT NOT NULL,
    answer_index INTEGER NOT NULL CHECK (answer_index BETWEEN 1 AND 4),
    display_order INTEGER NOT NULL
);
