-- 오늘의 학습 「漆器」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=%E6%BC%86%E5%99%A8&oldid=107637821 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('漆器') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '漆器');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '漆器');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '漆器');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '漆器');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '漆器'), '漆', 'シツ', 'うるし', '옻, 니스, 일곱', 1, 1),
    ((SELECT id FROM themes WHERE title = '漆器'), '器', 'キ', 'うつわ', '도구, 그릇, 용기', 1, 2),
    ((SELECT id FROM themes WHERE title = '漆器'), '樹', 'ジュ', 'き', '목재, 나무, 세우다', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '漆器'), 'WORD', '漆器', 'しっき', '칠기', 1, 1),
    ((SELECT id FROM themes WHERE title = '漆器'), 'WORD', '食器', 'しょっき', '식기', 1, 2),
    ((SELECT id FROM themes WHERE title = '漆器'), 'WORD', '素地', 'そじ', '소질, 적성, 기초', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '漆器'), 'EXPRESSION', '挙げる', 'あげる', '열거하다, 보여주다, 체포하다', 1, 1),
    ((SELECT id FROM themes WHERE title = '漆器'), 'EXPRESSION', '塗る', 'ぬる', '바르다, 칠하다, 펴다', 2, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '漆器'), 'どこに食器があるの？', '어디에 식기가 있어?', 'どこにしょっきがあるの？', 1),
    ((SELECT id FROM themes WHERE title = '漆器'), 'マングローブは、地球上の他のどの木よりも多くの二酸化炭素を吸収します。これは、大きな地下根の構造を持っているためです。', '맹그로브는 지구상의 다른 어떤 나무보다 더 많은 이산화탄소를 흡수해요. 그 이유는 큰 지하 뿌리 구조를 가지고 있기 때문이에요.', 'まんぐろーぶは、ちきゅうじょうのほかのどのきよりもおおくのにさんかたんそをきゅうしゅうします。これは、おおきなちげこんのこうぞうをもっているためです。', 2),
    ((SELECT id FROM themes WHERE title = '漆器'), '私は一ヶ月後に結婚式を挙げる。', '나는 한 달 후에 결혼식을 올린다.', 'わたしはいちかげつごにけっこんしきをあげる。', 3),
    ((SELECT id FROM themes WHERE title = '漆器'), '壁にペンキを塗るんです。', '벽에 페인트를 칠할 거예요.', 'かべにぺんきをぬるんです。', 4);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = '漆器'), 1, '漆器は、木や紙などに漆を塗り重ねて作る工芸品である。狭義には「漆を塗った食器」の意味であるが、広義では漆が塗られた漆工品全般が含まれる。歴史的にアジアを中心とした国で、食器、箱、箪笥、台、棚、車体などの様々な用途で作られ、日用品から高度に装飾された美術工芸品まで多様な工芸品が作られた。漆を表面に塗ることで器物は格段に長持ちする。
ウルシから採れる加工した樹液を漆と言い、これを加工された素地に下地工程、塗り工程と、細かく挙げると30から40になる手順を経て漆器に仕上げていく。この工程は漆工と言われそれぞれに名前があり、生産地別で考え出された漆工も合わせると多岐にわたる。利用される素地には、よく乾燥された木材、竹、紙、金属などがあり、現代では合成樹脂も使われている。更に、漆にセルロースナノファイバーを混ぜて光沢や強度を高める技術が開発される など、時代とともに変化している。
天然の木地や漆を用いた伝統的な漆器に対し、合成樹脂や合成塗料を用いたものを合成漆器という。', NULL, 1, '漆器', 'https://ja.wikipedia.org/w/index.php?title=%E6%BC%86%E5%99%A8&oldid=107637821', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '漆器') AND display_order = 1), '漆器の定義や用途について正しいものはどれか。', '狭義には漆を塗った家具全般を指す。', 'アジアを中心とした国で、食器や車体など様々な用途で作られてきた。', '歴史的に美術工芸品としての用途しかなかった。', '表面に漆を塗っても、器物の持ちは特に変わらない。', 2, '狭義には「漆を塗った食器」の意味であるが、広義では漆が塗られた漆工品全般が含まれ、車体などの様々な用途で作られたと書かれている。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '漆器') AND display_order = 1), '漆器の製造工程や素地について正しいものはどれか。', '手順を細かく挙げると3から4ほどの少ない工程で仕上げられる。', '現代では、素地として合成樹脂が使われることはない。', '漆は合成された樹液から作られる。', '伝統的な漆器に対して、合成樹脂や合成塗料を用いたものを合成漆器という。', 4, '天然の木地や漆を用いた伝統的な漆器に対し、合成樹脂や合成塗料を用いたものを合成漆器というびと書かれている。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '漆器') AND display_order = 1), '漆器に関する技術や変化について正しいものはどれか。', '漆にセルロースナノファイバーを混ぜて光沢や強度を高める技術が開発されている。', '生産地別で考え出された漆工は存在しない。', '漆器の作り方は時代を通じて一切変化していない。', '利用される素地は木材と竹だけで、金属や紙は使われない。', 1, '漆にセルロースナノファイバーを混ぜて光沢や強度を高める技術が開発されるなど、時代とともに変化していると書かれている。', 3);
