-- 테마 학습 단계(한자/단어/표현/예문)의 실제 콘텐츠 테이블. 독해(READING)는 아직 별도로 설계되지
-- 않아(요구사항 문서의 "나중에 고려" 항목) 이번에는 다루지 않는다.
--
-- 데이터 출처: 한자/단어/표현은 kanjiapi.dev(KANJIDIC2 + JMdict, EDRDG 라이선스), 예문은
-- Tatoeba(CC BY)에서 1회성으로 받아온 실제 사전 데이터를 그대로 심는다. 자세한 배경과 검토한
-- 대안은 docs/decisions/0012-theme-content-data-source.md 참고.
--
-- 단어(WORD)와 표현(EXPRESSION)은 둘 다 kanjiapi.dev의 단어 조회 결과로 데이터 모양(표기/읽는
-- 법/뜻/레벨)이 완전히 같아서 테이블을 하나로 묶고 stage 컬럼으로만 구분한다.
--
-- jlpt_level: kanjiapi.dev가 주는 한자별 JLPT 레벨(N5=5 ~ N1=1)을 그대로 쓴다. 단어/표현의
-- 레벨은 kanjiapi.dev가 단어 단위 레벨을 제공하지 않아서, 단어를 이루는 한자들 중 가장 어려운
-- (숫자가 작은) 레벨을 그대로 가져왔다 — 둘 다 AI가 지어낸 값이 아니라 실제 한자 데이터에서
-- 계산한 값이다.
CREATE TABLE theme_kanji (
    id BIGSERIAL PRIMARY KEY,
    theme_id BIGINT NOT NULL REFERENCES themes (id),
    kanji VARCHAR(4) NOT NULL,
    on_reading VARCHAR(100) NOT NULL,
    kun_reading VARCHAR(100) NOT NULL,
    meaning VARCHAR(200) NOT NULL,
    jlpt_level INTEGER NOT NULL,
    display_order INTEGER NOT NULL
);

CREATE TABLE theme_vocabulary (
    id BIGSERIAL PRIMARY KEY,
    theme_id BIGINT NOT NULL REFERENCES themes (id),
    stage VARCHAR(20) NOT NULL,
    surface_form VARCHAR(100) NOT NULL,
    reading VARCHAR(100) NOT NULL,
    meaning VARCHAR(200) NOT NULL,
    jlpt_level INTEGER NOT NULL,
    display_order INTEGER NOT NULL
);

CREATE TABLE theme_example (
    id BIGSERIAL PRIMARY KEY,
    theme_id BIGINT NOT NULL REFERENCES themes (id),
    japanese_sentence VARCHAR(300) NOT NULL,
    translation VARCHAR(300) NOT NULL,
    display_order INTEGER NOT NULL
);

-- 카페에서 주문하기
INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), '水', 'スイ', 'みず', '물', 5, 1),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), '飲', 'イン, オン', 'のむ', '마시다', 4, 2),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), '席', 'セキ', 'むしろ', '자리, 좌석', 3, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'WORD', '注文', 'ちゅうもん', '주문', 4, 1),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'WORD', '飲み物', 'のみもの', '음료, 마실 것', 4, 2),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'WORD', '会計', 'かいけい', '계산, 회계', 4, 3),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'EXPRESSION', 'お願いします', 'おねがいします', '부탁합니다, 주세요', 3, 1),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'EXPRESSION', 'お待たせしました', 'おまたせしました', '기다리게 해서 죄송합니다', 4, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), '彼女は紅茶を注文した。', '그녀는 차 한 잔을 주문했다.', 1),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'お飲み物はいかがなさいますか？', '무엇을 마십니까?', 2);

-- 길 묻기
INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '길 묻기'), '右', 'ウ, ユウ', 'みぎ', '오른쪽', 5, 1),
    ((SELECT id FROM themes WHERE title = '길 묻기'), '左', 'サ, シャ', 'ひだり', '왼쪽', 5, 2),
    ((SELECT id FROM themes WHERE title = '길 묻기'), '道', 'ドウ, トウ', 'みち', '길', 4, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'WORD', '交差点', 'こうさてん', '교차로', 3, 1),
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'WORD', '近く', 'ちかく', '근처, 가까이', 4, 2),
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'WORD', '道順', 'みちじゅん', '가는 길, 길 안내', 2, 3),
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'EXPRESSION', '真っ直ぐ', 'まっすぐ', '곧장, 똑바로', 3, 1),
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'EXPRESSION', '気をつけて', 'きをつけて', '조심하세요', 3, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '길 묻기'), '右に曲がってください。', '오른쪽으로 돌아주세요.', 1),
    ((SELECT id FROM themes WHERE title = '길 묻기'), '二つ目の信号を左に曲がらないといけない。', '두번째 신호등에서 좌회전하셔야 됩니다.', 2);
