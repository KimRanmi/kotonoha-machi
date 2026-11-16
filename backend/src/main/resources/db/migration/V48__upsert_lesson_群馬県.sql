-- 오늘의 학습 「群馬県」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=%E7%BE%A4%E9%A6%AC%E7%9C%8C&oldid=111480905 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('群馬県') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '群馬県');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '群馬県');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '群馬県');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '群馬県');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '群馬県'), '栽', 'サイ', '', '농장, 식재', 1, 1),
    ((SELECT id FROM themes WHERE title = '群馬県'), '培', 'バイ', 'つちか.う', '경작하다, 육성하다', 1, 2),
    ((SELECT id FROM themes WHERE title = '群馬県'), '養', 'ヨウ, リョウ', 'やしな.う', '기르다, 양육하다, 발전시키다', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '群馬県'), 'WORD', '栽培', 'さいばい', '경작', 1, 1),
    ((SELECT id FROM themes WHERE title = '群馬県'), 'WORD', '養蚕', 'ようさん', '양잠', 1, 2),
    ((SELECT id FROM themes WHERE title = '群馬県'), 'WORD', '繊維', 'せんい', '섬유', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '群馬県'), 'EXPRESSION', '加える', 'くわえる', '더하다, 합하다, 첨부하다', 3, 1),
    ((SELECT id FROM themes WHERE title = '群馬県'), 'EXPRESSION', '進む', 'すすむ', '나아가다, 진전하다, 진행하다', 3, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '群馬県'), '米の栽培をしています。', '쌀을 재배하고 있습니다.', 'べいのさいばいをしています。', 1),
    ((SELECT id FROM themes WHERE title = '群馬県'), '私の親は養蚕業を営んでいた。', '나의 부모님은 양잠업을 하셨다.', 'わたしのおやはようさんぎょうをいとなんでいた。', 2),
    ((SELECT id FROM themes WHERE title = '群馬県'), 'これは優れた繊維源である。', '이것은 우수한 섬유원이다.', 'これはすぐれたせんいげんである。', 3),
    ((SELECT id FROM themes WHERE title = '群馬県'), '９９９９に１を加えると１００００です。', '구천구백구십구 더하기 일은 만이다.', 'きゅうきゅうきゅうきゅうにいちをくわえるといちぜろぜろぜろぜろです。', 4);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = '群馬県'), 1, '群馬県は、日本の関東地方に位置する県。県庁所在地は前橋市。
旧国名は上野国。米麦栽培・養蚕・繊維工業などの伝統産業に加え、畜産・野菜栽培・機械工業が盛んで、県北西部は草津温泉などに代表される温泉・保養地である。利根川上流ダム群の豊かな水量は県内はもとより、東京都を始めとする関東の電力・上水道の供給源となっている。県南東部は都市化が進み、首都圏整備法の都市開発区域に指定され、北関東工業地域を形成している。', NULL, 1, '群馬県', 'https://ja.wikipedia.org/w/index.php?title=%E7%BE%A4%E9%A6%AC%E7%9C%8C&oldid=111480905', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '群馬県') AND display_order = 1), '群馬県に関する説明として正しいものはどれか。', '日本の関西地方に位置している。', '米麦栽培や養蚕などの伝統産業は一切行われていない。', '旧国名は上野国である。', '県庁所在地は高崎市である。', 3, '旧国名は上野国であると書かれている。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '群馬県') AND display_order = 1), '群馬県の産業や特徴について正しいものはどれか。', '機械工業や畜産は盛んではない。', '県南東部は農業地帯としてのみ発展し、都市化は進んでいない。', '県北西部は草津温泉などに代表される温泉・保養地である。', '利根川上流ダム群の水量は東京都には供給されていない。', 3, '県北西部は草津温泉などに代表される温泉・保養地であると書かれている。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '群馬県') AND display_order = 1), '群馬県の地理や水資源について正しいものはどれか。', '利根川上流ダム群の豊かな水量は、関東の電力や上水道の供給源となっている。', '首都圏整備法の都市開発区域に指定されているのは県北西部である。', '県庁所在地は草津町である。', '北関東工業地域を形成しているのは県北部である。', 1, '利根川上流ダム群の豊かな水量は県内はもとより、東京都を始めとする関東の電力・上水道の供給源となっていると書かれている。', 3);
