-- V7에서 심은 테마 콘텐츠 중 일부(水/물, 右/오른쪽, 左/왼쪽, 注文/주문 등)가 요구사항 문서의
-- "JLPT N3~N1 수준"(docs/requirements.md:103) 기준보다 쉬운 N4/N5 생존 어휘였다. 레벨 기준에
-- 맞게 N1~N3 어휘로 데이터를 교체한다.
--
-- 이미 적용된 V7 파일 자체는 고치지 않는다 — Flyway는 적용된 마이그레이션의 체크섬을
-- 검증하므로, 이미 V7을 적용한 환경(로컬 개발 DB 등)에서 파일을 고치면 검증 오류가 난다.
-- 대신 새 마이그레이션으로 데이터만 지우고 다시 심는다. 출처는 V7과 동일(kanjiapi.dev +
-- Tatoeba, 1회성 수집) — docs/decisions/0012-theme-content-data-source.md 참고.
DELETE FROM theme_kanji;
DELETE FROM theme_vocabulary;
DELETE FROM theme_example;

-- 카페에서 주문하기
INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), '混', 'コン', 'まじる, まざる, まぜる, こむ', '섞다, 혼합되다', 2, 1),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), '雑', 'ザツ, ゾウ', 'まじえる, まじる', '여러 가지가 뒤섞임', 3, 2),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), '満', 'マン, バン', 'みちる, みつ, みたす', '가득 차다, 만족하다', 3, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'WORD', '混雑', 'こんざつ', '혼잡, 붐빔', 2, 1),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'WORD', '満席', 'まんせき', '만석, 자리 없음', 3, 2),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'WORD', '種類', 'しゅるい', '종류', 3, 3),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'EXPRESSION', '苦い', 'にがい', '쓰다, 씁쓸하다', 3, 1),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'EXPRESSION', '甘い', 'あまい', '달다', 2, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'その薬は苦い味がするんだ。', '그 약은 쓰다.', 1),
    ((SELECT id FROM themes WHERE title = '카페에서 주문하기'), 'トムは甘いもの大丈夫？', '톰은 단 거 괜찮아?', 2);

-- 길 묻기
INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '길 묻기'), '迷', 'メイ', 'まよう', '길을 잃다, 망설이다', 3, 1),
    ((SELECT id FROM themes WHERE title = '길 묻기'), '周', 'シュウ', 'まわり', '둘레, 주위', 2, 2),
    ((SELECT id FROM themes WHERE title = '길 묻기'), '辺', 'ヘン', 'あたり, ほとり', '근처, 가, 경계', 2, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'WORD', '周辺', 'しゅうへん', '주변, 인근', 2, 1),
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'WORD', '距離', 'きょり', '거리', 1, 2),
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'WORD', '案内', 'あんない', '안내', 1, 3),
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'EXPRESSION', '迷う', 'まよう', '길을 잃다, 헤매다', 3, 1),
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'EXPRESSION', '渡る', 'わたる', '건너다', 3, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '길 묻기'), 'どのくらいの距離ですか。', '얼마나 멀어요?', 1),
    ((SELECT id FROM themes WHERE title = '길 묻기'), '道路を渡るときは注意しなければなりません。', '길을 건널 때는 조심해야 한다.', 2);
