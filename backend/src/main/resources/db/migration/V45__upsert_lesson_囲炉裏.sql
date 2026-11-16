-- 오늘의 학습 「囲炉裏」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.
-- 출처: https://ja.wikipedia.org/w/index.php?title=%E5%9B%B2%E7%82%89%E8%A3%8F&oldid=111171687 (CC BY-SA 4.0). scripts/import-theme-content로 생성:
-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.

INSERT INTO themes (title) VALUES ('囲炉裏') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '囲炉裏');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '囲炉裏');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '囲炉裏');
DELETE FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '囲炉裏');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '囲炉裏'), '炉', 'ロ', 'いろり', '화덕, 용광로, 원자로', 1, 1),
    ((SELECT id FROM themes WHERE title = '囲炉裏'), '端', 'タン', 'はし, は, はた, -ばた, はな', '가장자리, 기원, 끝', 1, 2),
    ((SELECT id FROM themes WHERE title = '囲炉裏'), '恒', 'コウ', 'つね, つねに', '불변, 항상', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '囲炉裏'), 'WORD', '囲炉裏', 'いろり', '이로리, 매립 화덕', 1, 1),
    ((SELECT id FROM themes WHERE title = '囲炉裏'), 'WORD', '恒久', 'こうきゅう', '영구, 영속', 1, 2),
    ((SELECT id FROM themes WHERE title = '囲炉裏'), 'WORD', '伝統', 'でんとう', '전통, 관습', 1, 3);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '囲炉裏'), 'EXPRESSION', '敷き詰める', 'しきつめる', '표면을 덮다, 온통 펴바르다, 깔다', 1, 1),
    ((SELECT id FROM themes WHERE title = '囲炉裏'), 'EXPRESSION', '設ける', 'もうける', '준비하다, 마련하다, 설립하다', 2, 2);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '囲炉裏'), '恒久的な平和など幻想に過ぎない。', '영구적인 평화 따위는 환상에 불과하다.', 'こうきゅうてきなへいわなどげんそうにすぎない。', 1),
    ((SELECT id FROM themes WHERE title = '囲炉裏'), 'その女の子たちはカダザンの伝統衣装を着ている。', '그 소녀들은 카다잔 전통 의상을 입고 있다.', 'そのおんなのこたちはかだざんのでんとういしょうをきている。', 2),
    ((SELECT id FROM themes WHERE title = '囲炉裏'), '最悪・・・入場制限を設けるしかないでしょう。整理券の配布とかで。', '최악이야... 입장 제한을 둘 수밖에 없겠지요. 번호표를 배부한다든가 해서.', 'さいあく・・・にゅうじょうせいげんをもうけるしかないでしょう。せいりけんのはいふとかで。', 3);

INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)
VALUES
    ((SELECT id FROM themes WHERE title = '囲炉裏'), 1, '囲炉裏は、屋内に恒久的に設けられる炉の一種。伝統的な日本の家屋において、床を四角く切り下げて灰を敷き詰め、薪や炭火などを燃やすために設けられた一角のことである。天井・梁から吊るした自在鉤に鍋や鉄瓶を掛けて調理・炊事に使うとともに、暖房や照明の役割を担った。囲炉裏の近くを囲炉裏端と呼び、家族団欒の場となった。数える際には「基」を用いる。
家庭の電化などで第二次世界大戦後の昭和30年代以降、急速に姿を消した。その後も古民家などで保存されているほか、ノスタルジックな雰囲気を演出するため囲炉裏を設ける、炉端焼きなどの飲食店もある。', NULL, 1, '囲炉裏', 'https://ja.wikipedia.org/w/index.php?title=%E5%9B%B2%E7%82%89%E8%A3%8F&oldid=111171687', 'CC BY-SA 4.0', true);

INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)
VALUES
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '囲炉裏') AND display_order = 1), '囲炉裏に関する説明として正しいものはどれか。', '第二次世界大戦後、家庭の電化などを理由に急速に姿を消した。', '天井や梁から吊るした自在鉤は、暖房や照明の目的でのみ使われた。', '囲炉裏を数えるときには「個」という単位が用いられる。', '現代では、古民家以外の場所では一切見ることができない。', 1, '家庭の電化などで第二次世界大戦後の昭和30年代以降、急速に姿を消したと書かれている。', 1),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '囲炉裏') AND display_order = 1), '伝統的な日本家屋における囲炉裏について、正しいものはどれか。', '屋内に一時的に設けられる炉の一種である。', '調理や炊事には使われず、専ら照明としてのみ使用された。', '床を四角く切り下げて灰を敷き詰め、薪や炭火などを燃やすために設けられた。', '囲炉裏の近くは家族が避ける場所として使われていた。', 3, '床を四角く切り下げて灰を敷き詰め、薪や炭火などを燃やすために設けられた一角のことであると書かれている。', 2),
    ((SELECT id FROM theme_reading_passage WHERE theme_id = (SELECT id FROM themes WHERE title = '囲炉裏') AND display_order = 1), '囲炉裏の現在の状況について正しいものはどれか。', '現在では日本全国のすべての家庭に再び普及している。', '古民家でもすべて撤去されてしまい、もう残っていない。', '飲食店では使われることが法律で禁止されている。', 'ノスタルジックな雰囲気を演出するために囲炉裏を設ける飲食店がある。', 4, 'ノスタルジックな雰囲気を演出するため囲炉裏を設ける、炉端焼きなどの飲食店もあると書かれている。', 3);
