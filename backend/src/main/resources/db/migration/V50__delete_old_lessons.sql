-- 위키백과 지문 학습(V40~V49)으로 교체하기 위해 기존 학습 10개와 딸린 콘텐츠·진행 기록을 지운다.
-- 반드시 V40~V49가 적용된 뒤(번호 순서)에 실행돼야 한다. 제목으로만 골라 지워서 새 학습은 건드리지 않는다.
-- 자식 테이블(진행 기록, 한자·단어·표현·예문, 독해 지문)을 먼저 지우고 themes를 마지막에 지운다.
-- 독해 이해 문제(theme_reading_question)는 지문 삭제 때 ON DELETE CASCADE로 함께 지워진다.
-- 단어장(vocabulary)은 학습에 외래키가 걸려 있지 않아 그대로 남는다.
CREATE TEMPORARY TABLE old_lesson_ids ON COMMIT DROP AS
SELECT id FROM themes
WHERE title IN (
    '카페에서 주문하기', '길 묻기', '도서관에서 책 빌리기', '쇼핑하기', '병원에서 진료받기',
    '식당에서 식사하기', '학교에서 공부하기', '우체국에서 편지 보내기', '날씨와 계절 이야기하기',
    '자기소개하기');

DELETE FROM theme_progress WHERE theme_id IN (SELECT id FROM old_lesson_ids);
DELETE FROM theme_reading_passage WHERE theme_id IN (SELECT id FROM old_lesson_ids);
DELETE FROM theme_example WHERE theme_id IN (SELECT id FROM old_lesson_ids);
DELETE FROM theme_vocabulary WHERE theme_id IN (SELECT id FROM old_lesson_ids);
DELETE FROM theme_kanji WHERE theme_id IN (SELECT id FROM old_lesson_ids);
DELETE FROM themes WHERE id IN (SELECT id FROM old_lesson_ids);
