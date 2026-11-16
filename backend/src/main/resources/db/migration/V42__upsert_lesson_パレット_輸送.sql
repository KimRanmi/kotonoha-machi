-- 오늘의 학습 「パレット (輸送)」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=%E3%83%91%E3%83%AC%E3%83%83%E3%83%88%20(%E8%BC%B8%E9%80%81)&oldid=109516388 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('パレット (輸送)') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = 'パレット (輸送)');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = 'パレット (輸送)');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = 'パレット (輸送)');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'パレット (輸送)');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), '載', 'サイ', 'の.せる, の.る', '타다, 승선하다, 얹다', 1, 1),
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), '脚', 'キャク, キャ, カク', 'あし', '스키드, 다리, 하부 구조', 1, 2),
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), '倉', 'ソウ', 'くら', '광창, 창고, 토지', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), 'WORD', '倉庫', 'そうこ', '창고, 저장고', 1, 1),
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), 'WORD', '効率', 'こうりつ', '효율성', 1, 2),
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), 'WORD', '扱い', 'あつかい', '치료, 서비스, 다루기', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), 'EXPRESSION', '載せる', 'のせる', '태우다, 싣다, 얹다', 1, 1),
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), 'EXPRESSION', '述べる', 'のべる', '진술하다, 표현하다, 말하다', 2, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), '倉庫のドアの鍵をかけ忘れたのは誰なの？', '창고 문을 잠그지 않은 사람이 누구야?', 'そうこのどあのかぎをかけわすれたのはだれなの？', 1),
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), '勉強は効率的にしなくてはいけない。', '너는 더 능률적으로 공부해야 된다.', 'べんきょうはこうりつてきにしなくてはいけない。', 2),
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), '天文学は恒星と惑星の研究を扱います。', '천문학은 별과 행성에 대한 연구를 포함합니다.', 'てんもんがくはこうせいとわくせいのけんきゅうをあつかいます。', 3),
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), 'この荷物をトラックに載せるの手伝って。', '이 짐을 트럭에 싣는 것 좀 도와줘.', 'このにもつをとらっくにのせるのてつだって。', 4);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = 'パレット (輸送)'), 1, 'パレットは、物流に用いる、荷物を載せるための荷役台。もっとも代表的な平パレットの他に、ボックスパレット、シートパレットなどの多くの種類が存在する。パレットを使用した荷役方法はパレチゼーションと呼ばれ、パレット単位に商品を纏めることをユニットロードと呼ぶ。

工場やトラック、海上コンテナ、倉庫、運送会社の営業所などでの荷役作業の向上や生産性向上による効率の最適化、作業負担の軽減や扱いをし易くするために使用される。一般的なパレットであれば、運搬の際には台上に荷物を載せ、パレットの脚と脚の間にフォークリフトやハンドリフトの爪を差し込んで持ち上げる。標準的なパレットであれば一枚で1トンの移動が可能であり、荷物をはい付けた状態で2段、3段と重ねたり、パレットラックなどの保管設備に格納したりすることができる。材質は木材でできたものが多いが、湿気などに強い合成樹脂製も多くなっている。
なお、航空輸送においては、アルミ合金で作られた板状のULDをパレットと呼ぶ。その場合、本項で述べているものは、スキッドと呼ぶことが一般的である。', NULL, 1, 'パレット (輸送)', 'https://ja.wikipedia.org/w/index.php?title=%E3%83%91%E3%83%AC%E3%83%83%E3%83%88%20(%E8%BC%B8%E9%80%81)&oldid=109516388', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'パレット (輸送)') AND display_order = 1), 'パレットの主な用途や使用目的として正しいものはどれか。', '商品を1トンずつ完全に密閉して保管するための設備である。', '湿気を防ぐためにすべてのパレットが合成樹脂製で作られている。', '荷役作業の向上や効率の最適化、作業負担の軽減のために使用される。', '海上での運送コストを削減するために航空輸送専用で作られている。', 3, '荷役作業の向上や生産性向上による効率の最適化、作業負担の軽減や扱いをし易くするために使用される、とある。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'パレット (輸送)') AND display_order = 1), 'パレットの運搬や構造についての記述で正しいものはどれか。', '材質は合成樹脂製がもっとも多く、木製のものはほとんど使われない。', 'フォークリフトやハンドリフトの爪をパレットの脚と脚の間に差し込んで持ち上げる。', '標準的なパレットは一枚で5トンの移動が可能である。', '航空輸送ではアルミ合金製の板状のものが「スキッド」と呼ばれる。', 2, '一般的なパレットであれば、運搬の際には台上に荷物を載せ、パレットの脚と脚の間にフォークリフトやハンドリフトの爪を差し込んで持ち上げる、と記載されている。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = 'パレット (輸送)') AND display_order = 1), '航空輸送におけるパレットの呼び方について正しいものはどれか。', 'アルミ合金で作られた板状のULDをパレットと呼ぶ。', '航空輸送では本項で述べているものをパレットと呼び、アルミ製の板はスキッドと呼ぶ。', '航空輸送では平パレットやボックスパレットがそのまま使用される。', '航空輸送において荷役台は一切使用されない。', 1, '航空輸送においては、アルミ合金で作られた板状のULDをパレットと呼ぶ、と述べられている。', 3);
