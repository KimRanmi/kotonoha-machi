-- 오늘의 학습 「クラウドファンディング」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=%E3%82%AF%E3%83%A9%E3%82%A6%E3%83%89%E3%83%95%E3%82%A1%E3%83%B3%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0&oldid=110514913 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('クラウドファンディング') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = 'クラウドファンディング');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = 'クラウドファンディング');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = 'クラウドファンディング');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'クラウドファンディング');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), '及', 'キュウ', 'およ.ぶ, およ.び, および, およ.ぼす', '손을 뻗다, 발휘하다, 야기하다', 1, 1),
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), '衆', 'シュウ, シュ', 'おお.い', '대중, 다수, 군중', 1, 2),
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), '織', 'ショク, シキ', 'お.る, お.り, おり, -おり, -お.り', '직물, 짜기', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), 'WORD', '普及', 'ふきゅう', '보급, 확산, 대중화', 1, 1),
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), 'WORD', '群衆', 'ぐんしゅう', '무리, 군중, 떼', 1, 2),
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), 'WORD', '組織', 'そしき', '조직, 형성, 구조', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), 'EXPRESSION', '略す', 'りゃくす', '줄이다, 생략하다, 빼다', 2, 1),
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), 'EXPRESSION', '募る', 'つのる', '강해지다, 격렬해지다, 악화되다', 2, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), '電子商取引が急速に普及し始めた。', '전자 상거래가 급속히 보급되기 시작했다.', 'でんししょうとりひきがきゅうそくにふきゅうしはじめた。', 1),
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), '群衆は静かになった。', '군중이 조용해졌다.', 'ぐんしゅうはしずかになった。', 2),
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), 'トムはこの組織の一員です。', '톰은 이 조직의 일원입니다.', 'とむはこのそしきのいちいんです。', 3),
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), '何の略字ですか。', '어떤 약자입니까?', 'なにのりゃくじですか。', 4);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = 'クラウドファンディング'), 1, 'クラウドファンディングは、群衆と資金調達を組み合わせた造語である。多数の人による少額の資金が他の人々や組織に財源の提供や協力などを行うことを意味する。ソーシャルファンディングとも呼ばれ、日本語では「クラファン」と略されることもある。
外来語としては比較的新しい言葉だが、インターネットが普及する以前から仕組み自体は存在する。また、目的のために資金を募るという意味では、ロシア語由来のカンパという言葉と共通点もある。
現代ではインターネット経由で実施する事例が多く、また日本語の音韻体系では r と l が区別されないため、クラウドコンピューティングの「cloud」と混同して「cloud funding」と誤表記されたり、関連性があると思われたりすることがある。しかし、両者に直接の関連性はない。インターネット技術の普及以前から不特定多数から資金を集める類似の手法は存在していた。', NULL, 1, 'クラウドファンディング', 'https://ja.wikipedia.org/w/index.php?title=%E3%82%AF%E3%83%A9%E3%82%A6%E3%83%89%E3%83%95%E3%82%A1%E3%83%B3%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0&oldid=110514913', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'クラウドファンディング') AND display_order = 1), 'クラウドファンディングについて正しいものはどれか。', '多数の人による少額の資金が財源の提供や協力などを行うことを意味する。', 'クラウドコンピューティングの「cloud」と直接的な関連性がある。', 'ロシア語由来のカンパとは意味も目的も全く共通点がない。', 'インターネットが普及する以前には存在しなかった手法である。', 1, '多数の人による少額の資金が他の人々や組織に財源の提供や協力などを行うことを意味する、と説明されている。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'クラウドファンディング') AND display_order = 1), 'クラウドファンディングの誤表記や混同について正しいものはどれか。', 'クラウドコンピューティングと資金調達の仕組みが完全に一致しているため混同される。', '日本語の音韻体系で r と l が区別されないため、cloud fundingと誤表記されることがある。', 'インターネット技術の普及以前から両者の混同が問題視されていた。', 'ロシア語のカンパと混同されて「クラファン」と略されることがある。', 2, '日本語の音韻体系では r と l が区別されないため、クラウドコンピューティングの「cloud」と混同して「cloud funding」と誤表記されたりすることがある、とある。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'クラウドファンディング') AND display_order = 1), 'クラウドファンディングの歴史や性質について正しいものはどれか。', 'インターネット技術の普及以前から不特定多数から資金を集める類似の手法が存在していた。', 'クラウドコンピューティングの技術を応用して資金を集める仕組みである。', '外来語としては古い言葉であり、インターネットと共に誕生した。', '資金を募るという意味において、ロシア語由来のカンパとは全く異なる言葉である。', 1, 'インターネット技術の普及以前から不特定多数から資金を集める類似の手法は存在していた、と書かれている。', 3);
