-- 오늘의 학습 「御城碁」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=%E5%BE%A1%E5%9F%8E%E7%A2%81&oldid=108601977 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('御城碁') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '御城碁');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '御城碁');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '御城碁');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '御城碁');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '御城碁'), '碁', 'ゴ', '', '바둑', 1, 1),
    ((SELECT id FROM themes WHERE title = '御城碁'), '棋', 'キ', 'ご', '말, 장기알, 쇼기', 1, 2),
    ((SELECT id FROM themes WHERE title = '御城碁'), '士', 'シ', 'さむらい', '신사, 학자, 무사', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '御城碁'), 'WORD', '棋士', 'きし', '프로 쇼기 기사, 프로 바둑 기사', 1, 1),
    ((SELECT id FROM themes WHERE title = '御城碁'), 'WORD', '囲碁', 'いご', '바둑', 1, 2),
    ((SELECT id FROM themes WHERE title = '御城碁'), 'WORD', '寛永', 'かんえい', '간에이 연간', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '御城碁'), 'EXPRESSION', '渡る', 'わたる', '건너다, 가로지르다, 걸치다', 3, 1),
    ((SELECT id FROM themes WHERE title = '御城碁'), 'EXPRESSION', '受ける', 'うける', '받다, 얻다, 입다', 3, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '御城碁'), 'トムは、自分で考えているほどいいチェスの棋士ではありません。', '톰은, 스스로 생각하는 것만큼 좋은 체스 기사가 아닙니다.', 'とむは、じぶんでかんがえているほどいいちぇすのきしではありません。', 1),
    ((SELECT id FROM themes WHERE title = '御城碁'), '彼が道路を渡るのを見た。', '그가 거리를 건너는 것을 보았다.', 'かれがどうろをわたるのをみた。', 2),
    ((SELECT id FROM themes WHERE title = '御城碁'), '今回賜りましたご意見につきましては、真摯に受け止めざるを得ません。', '이번에 주신 의견에 대해서는 진지하게 받아들이지 않을 수 없습니다.', 'こんかいたまわりましたごいけんにつきましては、しんしにうけとめざるをえません。', 3);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = '御城碁'), 1, '御城碁は、江戸時代に囲碁の家元四家の棋士により、徳川将軍の御前にて行われた対局。寛永3年頃に始まり、毎年1回、御城将棋とともに2、3局が行われ、幕末の元治元年に中止となるまでの230年余りに渡って続いた。御城碁に出仕することは、家元の代表としてであり、当時の棋士にとってもっとも真剣な勝負であった。また碁によって禄を受けている家元四家にとっては、碁の技量を将軍に披露する義務としての意味もあり、寺社奉行の呼び出しによるという形式で行われた。実際に将軍の上覧は少なく、代行として老中などが列席した。
全部で536局の対局が行われ、出仕した棋士は67名。代表的な成績としては、本因坊秀策の、嘉永2年から文久元年にかけての19連勝が有名。', NULL, 1, '御城碁', 'https://ja.wikipedia.org/w/index.php?title=%E5%BE%A1%E5%9F%8E%E7%A2%81&oldid=108601977', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '御城碁') AND display_order = 1), '御城碁について正しい説明はどれか。', '将軍が必ずすべての対局に直接出席して観戦していた。', '江戸時代に囲碁の家元四家の棋士により、徳川将軍の御前で行われた対局である。', '毎年2回、決まって開催されていた。', '幕末の元治元年に始まってから230年余り続いた。', 2, '江戸時代に囲碁の家元四家の棋士により、徳川将軍の御前にて行われた対局であると書かれている。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '御城碁') AND display_order = 1), '御城碁の形式や記録について正しいものはどれか。', '出仕した棋士の総数は536名であった。', '寺社奉行の呼び出しによるという形式で行われた。', '当時の棋士にとっては、それほど重要ではない気楽な勝負であった。', '本因坊秀策の代表的な成績は19戦全敗として知られている。', 2, '寺社奉行の呼び出しによるという形式で行われたと書かれている。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '御城碁') AND display_order = 1), '御城碁の開催期間や対局数について正しいものはどれか。', '寛永3年頃に始まり、230年余りに渡って続いた。', '全部で67局の対局が行われた。', '毎年1回、御城碁だけで10局以上が行われていた。', '出仕した棋士の人数は536名であった。', 1, '寛永3年頃に始まり、幕末の元治元年に中止となるまでの230年余りに渡って続いたと書かれている。', 3);
