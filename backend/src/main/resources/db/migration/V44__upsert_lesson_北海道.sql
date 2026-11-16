-- 오늘의 학습 「北海道」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=%E5%8C%97%E6%B5%B7%E9%81%93&oldid=111638388 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('北海道') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '北海道');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '北海道');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '北海道');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '北海道');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '北海道'), '称', 'ショウ', 'たた.える, とな.える, あ.げる, かな.う, はか.り, はか.る, ほめ.る', '칭호, 칭찬, 명성', 1, 1),
    ((SELECT id FROM themes WHERE title = '北海道'), '唯', 'ユイ, イ', 'ただ', '오로지, 다만, 그저', 1, 2),
    ((SELECT id FROM themes WHERE title = '北海道'), '鹿', 'ロク', 'しか, か', '사슴', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '北海道'), 'WORD', '唯一', 'ゆいいつ', '유일한, 단 하나의', 1, 1),
    ((SELECT id FROM themes WHERE title = '北海道'), 'WORD', '食糧', 'しょくりょう', '음식, 식량, 보급품', 1, 2),
    ((SELECT id FROM themes WHERE title = '北海道'), 'WORD', '基地', 'きち', '기지, 애호가, 광인', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '北海道'), 'EXPRESSION', '称す', 'しょうす', '부르다, 이름을 칭하다, 자칭하다', 1, 1),
    ((SELECT id FROM themes WHERE title = '北海道'), 'EXPRESSION', '担う', 'になう', '어깨에 메다, 지다, 책임지다', 2, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '北海道'), '教育は人間を人間として平和と幸福へ導く唯一の道であります。', '교육은 인간을 인간으로서 평화와 행복으로 이끄는 유일한 길입니다.', 'きょういくはにんげんをにんげんとしてへいわとこうふくへみちびくゆいいつのみちであります。', 1),
    ((SELECT id FROM themes WHERE title = '北海道'), '食糧が尽きた。', '식량이 바닥났다.', 'しょくりょうがつきた。', 2),
    ((SELECT id FROM themes WHERE title = '北海道'), '月の裏側には秘密基地がある。', '달의 뒷면에는 비밀 기지가 있다.', 'つきのうらがわにはひみつきちがある。', 3),
    ((SELECT id FROM themes WHERE title = '北海道'), '本物のノイローゼの奴がノイローゼだなんて自称するのかね？', '진짜 노이로제에 걸린 녀석이 노이로제라고 자칭하거나 할까?', 'ほんものののいろーぜのやつがのいろーぜだなんてじしょうするのかね？', 4);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = '北海道'), 1, '北海道は、日本の北東部に位置する唯一の「道」。道庁所在地は札幌市である。
行政区画の「北海道」を構成する最大の島自体も北海道と称されるが、区別するときには北海道本島とも称する。本州、四国、九州とともに本土四島を形成する。
農業出荷額は13,748億円と国内首位、二位の鹿児島県の2.4倍であり、その過半数は畜産である。また水産出荷額も9,028億円と国内首位、二位の長崎県の約3倍であり、日本の食糧基地としての役割を担い続けている。
ブランド総合研究所による「都道府県の魅力度ランキング」で2026年現在、18年連続で1位に選ばれ、観光意欲度、食品想起率でも1位、情報接触度でも2位になるなど各意欲の面で高い評価を得ている。', NULL, 1, '北海道', 'https://ja.wikipedia.org/w/index.php?title=%E5%8C%97%E6%B5%B7%E9%81%93&oldid=111638388', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '北海道') AND display_order = 1), '北海道の島や行政区画についての記述で正しいものはどれか。', '北海道は本州、四国、九州とともに本土四島を形成する一つの島である。', '本島以外の島々は北海道とは呼ばれず、別の独立した県として扱われる。', '行政区画としての北海道を構成する最大の島も北海道と称される。', '道庁所在地は函館市であり、日本の北東部に位置する唯一の道である。', 3, '行政区画の「北海道」を構成する最大の島自体も北海道と称される、と書かれている。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '北海道') AND display_order = 1), '北海道の農業や水産業の出荷額について正しいものはどれか。', '農業出荷額は国内首位であり、その過半数は畜産である。', '水産出荷額の国内首位は長崎県であり、北海道は第2位である。', '水産出荷額の過半数が農業出荷額に含まれている。', '農業出荷額の二位である鹿児島県の約3倍の出荷額を誇る。', 1, '農業出荷額は13,748億円と国内首位、二位の鹿児島県の2.4倍であり、その過半数は畜産である、とある。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '北海道') AND display_order = 1), 'ブランド総合研究所による調査での北海道の評価について正しいものはどれか。', '観光意欲度や食品想起率では高い評価を得ていない。', '「都道府県の魅力度ランキング」で2026年現在、18年連続で1位に選ばれている。', '情報接触度において国内首位の座を一度も譲ったことがない。', '情報接触度で18年連続1位に選ばれている。', 2, 'ブランド総合研究所による「都道府県の魅力度ランキング」で2026年現在、18年連続で1位に選ばれ、と記載されている。', 3);
