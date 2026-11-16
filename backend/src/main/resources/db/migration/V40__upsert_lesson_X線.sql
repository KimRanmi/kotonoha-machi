-- 오늘의 학습 「X線」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=X%E7%B7%9A&oldid=111436585 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('X線') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = 'X線');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = 'X線');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = 'X線');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'X線');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'X線'), '磁', 'ジ', '', '자석, 도자기', 1, 1),
    ((SELECT id FROM themes WHERE title = 'X線'), '射', 'シャ', 'い.る, さ.す, う.つ', '쏘다, 비추다, 궁도', 1, 2),
    ((SELECT id FROM themes WHERE title = 'X線'), '撮', 'サツ', 'と.る, つま.む, -ど.り', '스냅사진, 촬영하다', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'X線'), 'WORD', '電磁波', 'でんじは', '전자기파', 1, 1),
    ((SELECT id FROM themes WHERE title = 'X線'), 'WORD', '放射線', 'ほうしゃせん', '방사선', 1, 2),
    ((SELECT id FROM themes WHERE title = 'X線'), 'WORD', '撮影', 'さつえい', '사진 촬영, 촬영, 녹화', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'X線'), 'EXPRESSION', '述べる', 'のべる', '진술하다, 표현하다, 말하다', 2, 1),
    ((SELECT id FROM themes WHERE title = 'X線'), 'EXPRESSION', '含む', 'ふくむ', '포함하다, 담다, 품다', 2, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'X線'), '一日中コンピューターに向かってるから、結構電磁波浴びてる。', '하루 종일 컴퓨터 앞에 앉아 있어서, 꽤 전자기파를 쬐고 있어.', 'いちにちちゅうこんぴゅーたーにむかってるから、けっこうでんじはあびてる。', 1),
    ((SELECT id FROM themes WHERE title = 'X線'), '放射線を大量に浴びたら、すぐに嘔吐と下痢が始まります。', '방사선을 다량으로 쬐면, 곧 구토와 설사가 시작됩니다.', 'ほうしゃせんをたいりょうにあびたら、すぐにおうととげりがはじまります。', 2),
    ((SELECT id FROM themes WHERE title = 'X線'), '写真撮影禁止。', '사진 촬영 금지.', 'しゃしんさつえいきんし。', 3),
    ((SELECT id FROM themes WHERE title = 'X線'), '私は率直に意見を述べる人を尊敬します。', '저는 솔직하게 의견을 말하는 사람을 존경합니다.', 'わたしはそっちょくにいけんをのべるひとをそんけいします。', 4);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = 'X線'), 1, 'X線は、波長が1 pm - 10 nm程度の電磁波である。発見者であるヴィルヘルム・レントゲンの名をとってレントゲン線と呼ばれることもある。電磁波であるが放射線の一種でもあり、X線撮影、回折現象を利用した結晶構造の解析などに用いられる。呼称の由来は数学の“未知数”を表す「X」で、これもレントゲンの命名による。
1895年11月8日、ドイツのヴィルヘルム・レントゲンにより特定の波長域を持つ電磁波が発見され、X線として命名された。この発見は当時直ちに大反響を呼び、X線の発生について理論的方向付けを与えようとしたポアンカレは1896年1月に、蛍光物質とX線の関連について予測を述べた。その予測に従い、翌月の2月にアンリ・ベクレルはウランを含む燐光体が現代からいえば放射性物質であることを発見するなどX線の発見は原子核物理の端緒となった。
日本の法令上は片仮名を用いて「エックス線」若しくは「エツクス線」と表記するのが原則となっている。', NULL, 1, 'X線', 'https://ja.wikipedia.org/w/index.php?title=X%E7%B7%9A&oldid=111436585', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'X線') AND display_order = 1), 'X線の名称の由来について正しいものはどれか。', '発生についての理論的方向付けを行ったポアンカレが命名した。', '放射線の一種であることから科学的に名付けられた。', '数学の「未知数」を表す「X」に由来している。', '発見者であるヴィルヘルム・レントゲンの苗字から取られた。', 3, '呼称の由来は数学の“未知数”を表す「X」で、これもレントゲンの命名による、と書かれているので、数学の未知数が由来である。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'X線') AND display_order = 1), 'X線の発見に関連して正しいものはどれか。', '1895年11月8日にアンリ・ベクレルがウランを発見した。', 'ポアンカレが1896年1月に放射性物質を発見した。', 'レントゲンによる発見の翌月にベクレルが蛍光物質に関する予測を述べた。', 'ベクレルがウランを含む燐光体が放射性物質であることを発見した。', 4, 'ポアンカレの予測に従い、翌月の2月にアンリ・ベクレルはウランを含む燐光体が放射性物質であることを発見した、と記載されている。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'X線') AND display_order = 1), '日本の法令におけるX線の表記についての記述はどれか。', '漢字を用いて「X線」と表記することが義務づけられている。', '片仮名を用いて「エックス線」若しくは「エツクス線」と表記するのが原則である。', '英語の原音をそのまま用いて「レントゲン線」と表記するのが決まりである。', 'アルファベットをそのまま用いることが原則となっている。', 2, '日本の法令上は片仮名を用いて「エックス線」若しくは「エツクス線」と表記するのが原則となっている、と述べられている。', 3);
