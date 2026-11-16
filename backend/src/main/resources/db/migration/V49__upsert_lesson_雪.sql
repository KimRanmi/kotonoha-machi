-- 오늘의 학습 「雪」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=%E9%9B%AA&oldid=111639160 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('雪') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '雪');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '雪');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '雪');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '雪');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '雪'), '結', 'ケツ, ケチ', 'むす.ぶ, ゆ.う, ゆ.わえる', '묶다, 맺다, 조직하다', 1, 1),
    ((SELECT id FROM themes WHERE title = '雪'), '晶', 'ショウ', '', '반짝이다, 맑은, 수정', 1, 2),
    ((SELECT id FROM themes WHERE title = '雪'), '径', 'ケイ', 'みち, こみち, さしわたし, ただちに', '직경, 경로, 방법', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '雪'), 'WORD', '結晶', 'けっしょう', '결정, 결정화, 결실', 1, 1),
    ((SELECT id FROM themes WHERE title = '雪'), 'WORD', '直径', 'ちょっけい', '지름', 1, 2),
    ((SELECT id FROM themes WHERE title = '雪'), 'WORD', '牡丹雪', 'ぼたんゆき', '함박눈', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '雪'), 'EXPRESSION', '覆う', 'おおう', '덮다, 숨기다, 감추다', 1, 1),
    ((SELECT id FROM themes WHERE title = '雪'), 'EXPRESSION', '暖かい', 'あたたかい', '따뜻한, 온화한, 다정한', 1, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '雪'), '彼女は紙で雪の結晶を作った。', '그녀는 종이로 눈꽃을 만들었다.', 'かのじょはかみでゆきのけっしょうをつくった。', 1),
    ((SELECT id FROM themes WHERE title = '雪'), '地球の直径は、12,742キロです。', '지구의 직경은 12,742킬로미터입니다.', 'ちきゅうのちょっけいは、12,742きろです。', 2),
    ((SELECT id FROM themes WHERE title = '雪'), '牡丹雪が降りました。', '함박눈이 내렸습니다.', 'ぼたんゆきがおりました。', 3),
    ((SELECT id FROM themes WHERE title = '雪'), 'この山は一年を通じて雪に覆われている。', '이 산은 일년 내내 눈으로 덮여 있다.', 'このやまはいちねんをつうじてゆきにおおわれている。', 4);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = '雪'), 1, '雪は、大気中の水蒸気から生成される氷の結晶が空から落下してくる天気。
その結晶は主に板状、柱状、針状の六角形や不定形な粒状からなる。おおむね気温が-5℃より低いとひとつひとつの結晶が降る乾いた雪となるが、やや高い温度では集まり雪片をつくり、水分を含む湿った雪になることがある。直径1cmに満たないような小さなものを「粉雪」、綿状に集まったものを「牡丹雪、ぼたん雪、ぼた雪」と呼ぶなど、気温や湿度によって違う雪の性状はいくつかの呼び分けがある。
低い温度では降り積もって地表を覆い積雪になり、長く残ると根雪や万年雪となり、暖かい季節になるとゆっくりと解け出す。北極や南極、一部の山岳地帯では長年蓄積し変性して氷河をつくる。積雪や吹雪は交通の支障など人間活動に影響を与える一方、スキーやスノーボードなどのスポーツは雪を利用して行う。', NULL, 1, '雪', 'https://ja.wikipedia.org/w/index.php?title=%E9%9B%AA&oldid=111639160', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '雪') AND display_order = 1), '雪の生成や結晶について正しいものはどれか。', '気温が-5℃より高いと、必ず乾いた雪が降る。', '結晶の形はすべて完全な球体である。', '雪の結晶は板状や柱状などの六角形にはならない。', '大気中の水蒸気から生成される氷の結晶が空から落下してくる天気である。', 4, '大気中の水蒸気から生成される氷の結晶が空から落下してくる天気であると書かれている。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '雪') AND display_order = 1), '雪の呼び方や性状について正しいものはどれか。', '綿状に集まったものは「牡丹雪」などと呼ばれる。', '湿った雪は気温が-5℃より低いときにのみ降る。', '直径1cm以上の小さなものを「粉雪」と呼ぶ。', '気温や湿度によって雪の呼び方が変わることはない。', 1, '綿状に集まったものを「牡丹雪、ぼたん雪、ぼた雪」と呼ぶなどと書かれている。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '雪') AND display_order = 1), '積雪や雪の利用について正しいものはどれか。', '北極や南極、一部の山岳地帯では長年蓄積して氷河をつくる。', '積雪や吹雪は人間活動に何の影響も与えない。', 'スキーやスノーボードは雪を利用せずに行うスポーツである。', '万年雪は暖かい季節になっても絶対に解け出すことがない。', 1, '北極や南極、一部の山岳地帯では長年蓄積し変性して氷河をつくる と書かれている。', 3);
