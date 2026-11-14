-- 테마 학습 콘텐츠. 구글 시트(kotonoha-machi 테마 콘텐츠)에서 사람이 검수(review=ok)한 행을
-- scripts/import-theme-content의 import-sheet.mjs가 kanjiapi.dev와 대조한 뒤 만들었다.
-- 테마별로 기존 내용을 지우고 다시 넣는다(같은 테마를 시트에서 고쳐 새 버전으로 반영할 수 있음).

-- 자기소개하기
INSERT INTO themes (title) VALUES ('자기소개하기') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '자기소개하기');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '자기소개하기');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '자기소개하기');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '紹', 'ショウ', '', '소개하다, 잇다, 돕다', 2, 1),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '介', 'カイ', '', '끼이다, 매개하다', 2, 2),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '趣', 'シュ', 'おもむき, おもむ.く', '취지, 흥미', 1, 3),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '職', 'ショク, ソク', '', '고용, 일', 3, 4),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '性', 'セイ, ショウ', 'さが', '성별, 성, 본성', 3, 5),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '格', 'カク, コウ, キャク, ゴウ', '', '신분, 계급, 자격, 인격, 경우', 3, 6),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '技', 'ギ', 'わざ', '기술, 능력', 2, 7),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '経', 'ケイ, キョウ, キン', 'へ.る, た.つ, たていと, はか.る, のり', '경전, 지나다', 3, 8),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '歴', 'レキ, レッキ', '', '과정, 연속, 경과', 2, 9),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '将', 'ショウ, ソウ', 'まさ.に, はた, まさ, ひきい.る, もって', '장군, 앞으로', 2, 10),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '専', 'セン', 'もっぱ.ら', '전용, 주로, 오로지', 2, 11),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '攻', 'コウ', 'せ.める', '침략, 공격, 비판하다, 닦다', 1, 12);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '自己紹介', 'じこしょうかい', '자기소개', 1, 1),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'EXPRESSION', '初めまして', 'はじめまして', '만나서 반갑습니다, 처음 뵙겠습니다', 3, 1),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '趣味', 'しゅみ', '취미, 취향', 1, 2),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'EXPRESSION', '長所', 'ちょうしょ', '장점, 미덕, 이점', 3, 2),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '職業', 'しょくぎょう', '직업, 전문, 일', 3, 3),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'EXPRESSION', '短所', 'たんしょ', '결점, 단점, 약점, 불리함', 2, 3),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '性格', 'せいかく', '성격, 성질', 3, 4),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '特技', 'とくぎ', '특기', 2, 5),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '経験', 'けいけん', '경험', 3, 6),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '将来', 'しょうらい', '장래, 전망', 2, 7),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '勤務', 'きんむ', '근무, 임무, 일', 3, 8),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '在住', 'ざいじゅう', '거주, 살기, 주거', 3, 9),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '専攻', 'せんこう', '전공, 전문 연구', 1, 10),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '目標', 'もくひょう', '목표, 목적', 1, 11),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'WORD', '経歴', 'けいれき', '이력, 배경, 경력', 2, 12);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '自己紹介してください。', '자기소개를 하세요.', 'じこしょうかいしてください。', 1),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '趣味は何ですか。', '취미가 뭡니까?', 'しゅみはなにですか。', 2),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), 'ご職業は何ですか。', '직업이 뭐예요?', 'ごしょくぎょうはなにですか。', 3),
    ((SELECT id FROM themes WHERE title = '자기소개하기'), '性格もいい上に、格好よかった！', '성격도 좋은 데다가 얼굴도 잘생겼어!', 'せいかくもいいうえに、かっこうよかった！', 4);
