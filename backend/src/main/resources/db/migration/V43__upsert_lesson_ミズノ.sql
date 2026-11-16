-- 오늘의 학습 「ミズノ」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=%E3%83%9F%E3%82%BA%E3%83%8E&oldid=111236108 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('ミズノ') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = 'ミズノ');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = 'ミズノ');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = 'ミズノ');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'ミズノ');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'ミズノ'), '結', 'ケツ, ケチ', 'むす.ぶ, ゆ.う, ゆ.わえる', '묶다, 맺다, 조직하다', 1, 1),
    ((SELECT id FROM themes WHERE title = 'ミズノ'), '素', 'ソ, ス', 'もと', '초보의, 원리의, 날것의', 1, 2),
    ((SELECT id FROM themes WHERE title = 'ミズノ'), '製', 'セイ', '', '제조, 메이드 인', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'ミズノ'), 'WORD', '連結', 'れんけつ', '연결, 결합, 접합', 1, 1),
    ((SELECT id FROM themes WHERE title = 'ミズノ'), 'WORD', '株式会社', 'かぶしきがいしゃ', '주식회사', 1, 2),
    ((SELECT id FROM themes WHERE title = 'ミズノ'), 'WORD', '創業', 'そうぎょう', '창립, 설립', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'ミズノ'), 'EXPRESSION', '受け継ぐ', 'うけつぐ', '상속하다, 계승하다, 이어받다', 1, 1),
    ((SELECT id FROM themes WHERE title = 'ミズノ'), 'EXPRESSION', '置く', 'おく', '놓다, 두다, 설치하다', 3, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'ミズノ'), '鄄城、東阿、范県の三か所は、荀彧と程昱の二人の設計によって連結され、城郭は死守されました。', '그들의 권성, 동아, 범현 세 곳은 순욱과 정욱 두 사람의 설계로 서로 연결되었으며, 성곽을 죽을 각오로 지켰습니다.', '鄄じょう、ひがしおもね、范けんのさんかしょは、荀彧とほど昱のににんのせっけいによってれんけつされ、じょうかくはししゅされました。', 1),
    ((SELECT id FROM themes WHERE title = 'ミズノ'), 'SCOTT株式会社の株は優良株です。', 'SCOTT 주식회사의 주식은 우량주입니다.', 'SCOTTかぶしきがいしゃのかぶはゆうりょうかぶです。', 2),
    ((SELECT id FROM themes WHERE title = 'ミズノ'), 'この会社は1930年の創業です。', '이 회사는 1930년에 창업했습니다.', 'このかいしゃは1930ねんのそうぎょうです。', 3),
    ((SELECT id FROM themes WHERE title = 'ミズノ'), 'しかし、言語の場合は、私達が遺伝的に受け継ぐのは、話したり、理解したりする能力だけである。私達が話す特定の１つないし複数の言語は、遺伝ではなく、文化的な伝達によって伝えられるのである。', '하지만 언어의 경우에는, 우리가 유전적으로 물려받는 것은 말하거나 이해하는 능력뿐이다. 우리가 말하는 특정한 하나 또는 복수의 언어는, 유전이 아니라 문화적 전달에 의해 전해지는 것이다.', 'しかし、げんごのばあいは、わたしたちがいでんてきにうけつぐのは、はなしたり、りかいしたりするのうりょくだけである。わたしたちがはなすとくていのひとつないしふくすうのげんごは、いでんではなく、ぶんかてきなでんたつによってつたえられるのである。', 4);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = 'ミズノ'), 1, 'ミズノ株式会社は、大阪府大阪市住之江区と東京都千代田区に本社を置く、日本の大手総合スポーツ用品メーカー。
創業者水野利八の口癖『ええもんつくんなはれや』の精神が受け継がれている。経営理念は「より良いスポーツ品とスポーツの振興を通じて社会に貢献する。」、コーポレート・メッセージは「THE WORLD OF SPORTS」「明日は、きっと、できる。」で、2018年11月にはブランドスローガンを「REACH BEYOND」に刷新した。
野球・ゴルフ・ランニング・フットボール・インドアスポーツ・ワークビジネスを主要な販売カテゴリーとし、2026年3月期の連結売上高は約2,590億円、海外売上比率は40.1%、2026年3月31日時点の連結子会社は23社である。スポーツ用品以外に、航空機や自動車用の炭素繊維強化プラスチックなどの素材や、ビジネスシューズ・介助用品などスポーツ用品の技術を応用した製品も製造している。', NULL, 1, 'ミズノ', 'https://ja.wikipedia.org/w/index.php?title=%E3%83%9F%E3%82%BA%E3%83%8E&oldid=111236108', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'ミズノ') AND display_order = 1), 'ミズノ株式会社の創業者や精神について正しいものはどれか。', '東京に本社を置き、創業者水野利八の経営理念が現在も受け継がれている。', '創業者水野利八の口癖『ええもんつくんなはれや』の精神が受け継がれている。', 'コーポレート・メッセージである「REACH BEYOND」が創業時からの精神である。', '大阪府の企業であり、スポーツ用品の製造以外の事業は行っていない。', 2, '創業者水野利八の口癖『ええもんつくんなはれや』の精神が受け継がれている、と書かれている。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'ミズノ') AND display_order = 1), 'ミズノ株式会社の売上や事業内容に関する記述で正しいものはどれか。', 'スポーツ用品だけでなく、スポーツ用品の技術を応用した製品も製造している。', '航空機や自動車用の素材は製造しておらず、シューズのみを扱っている。', '2026年3月期の海外売上比率は20%未満である。', '2026年3月31日時点の連結子会社は100社を超えている。', 1, 'スポーツ用品以外に、航空機や自動車用の炭素繊維強化プラスチックなどの素材や、ビジネスシューズ・介助用品などスポーツ用品の技術を応用した製品も製造している、とある。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'ミズノ') AND display_order = 1), 'ミズノ株式会社のブランドスローガンについて正しいものはどれか。', '創業時から一貫して「THE WORLD OF SPORTS」がブランドスローガンである。', '「明日は、きっと、できる。」という言葉が2018年に新たに制定された。', '2018年11月にブランドスローガンを「REACH BEYOND」に刷新した。', 'コーポレート・メッセージは「REACH BEYOND」である。', 3, '2018年11月にはブランドスローガンを「REACH BEYOND」に刷新した、と記載されている。', 3);
