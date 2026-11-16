-- 테마 학습 콘텐츠. 구글 시트(kotonoha-machi 테마 콘텐츠)에서 사람이 검수(review=ok)한 행을
-- scripts/import-theme-content의 import-sheet.mjs가 kanjiapi.dev와 대조한 뒤 만들었다.
-- 테마별로 기존 내용을 지우고 다시 넣는다(같은 테마를 시트에서 고쳐 새 버전으로 반영할 수 있음).

-- 도서관에서 책 빌리기
INSERT INTO themes (title) VALUES ('도서관에서 책 빌리기') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '도서관에서 책 빌리기');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '도서관에서 책 빌리기');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '도서관에서 책 빌리기');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '返', 'ヘン', 'かえ.す, -かえ.す, かえ.る, -かえ.る', '반환, 응답, 갚다', 3, 1),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '閲', 'エツ', 'けみ.する', '검토, 검사', 1, 2),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '覧', 'ラン', 'み.る', '열람, 보다', 1, 3),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '蔵', 'ゾウ, ソウ', 'くら, おさ.める, かく.れる', '창고, 숨기다, 소유하다', 2, 4),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '棚', 'ホウ', 'たな, -だな', '선반, 받침대', 1, 5),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '刊', 'カン', '', '출판하다, 새기다, 조각하다', 2, 6),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '検', 'ケン', 'しら.べる', '심사, 조사하다', 1, 7),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '索', 'サク', '', '끈, 로프, 수색, 탐구', 1, 8),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '延', 'エン', 'の.びる, の.べる, の.べ, の.ばす', '연장, 신축', 2, 9),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '期', 'キ, ゴ', '', '기간, 시간, 날짜, 기한', 3, 10),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '限', 'ゲン', 'かぎ.る, かぎ.り, -かぎ.り', '한계, 제한하다, 최선을 다하여', 3, 11);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '返却', 'へんきゃく', '반환, 돌려주기, 상환', 1, 1),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'EXPRESSION', '延滞', 'えんたい', '체납, 연체, 지연, 미루기', 1, 1),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '閲覧', 'えつらん', '검사, 열람, 브라우징', 1, 2),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'EXPRESSION', '閲覧室', 'えつらんしつ', '열람실', 1, 2),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '延長', 'えんちょう', '연장, 신장, 연장선, 연장전', 2, 3),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '蔵書', 'ぞうしょ', '서적 수집, 개인 문고', 2, 4),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '司書', 'ししょ', '사서', 1, 5),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '検索', 'けんさく', '검색, 정보 검색', 1, 6),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '期限', 'きげん', '기한, 마감일', 3, 7),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '新刊', 'しんかん', '신간, 신간 도서', 2, 8),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '雑誌', 'ざっし', '잡지, 학술지, 정기간행물', 2, 9),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'WORD', '予約', 'よやく', '예약, 사전 주문, 구독', 3, 10);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '本は図書館に返却した？', '그 책을 도서관에 반납했어?', 'ほんはとしょかんにへんきゃくした？', 1),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), 'ジュネーブ大学の図書館には、いい閲覧室がある。', '제네바 대학의 도서관에는 좋은 열람실이 있다.', 'じゅねーぶだいがくのとしょかんには、いいえつらんしつがある。', 2),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '蔵書に書き込みをしないで下さい。', '도서관 책에 낙서를 하지 마십시오.', 'ぞうしょにかきこみをしないでください。', 3),
    ((SELECT id FROM themes WHERE title = '도서관에서 책 빌리기'), '何を検索していますか。', '뭐 찾으세요?', 'なにをけんさくしていますか。', 4);

-- 쇼핑하기
INSERT INTO themes (title) VALUES ('쇼핑하기') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '쇼핑하기');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '쇼핑하기');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '쇼핑하기');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '値', 'チ', 'ね, あたい', '가격, 비용, 값어치', 3, 1),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '割', 'カツ', 'わ.る, わり, わ.り, わ.れる, さ.く', '비율, 나누다', 3, 2),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '払', 'フツ, ヒツ, ホツ', 'はら.う, -はら.い, -ばら.い', '지불하다, 치우다, 처분하다', 3, 3),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '税', 'ゼイ', '', '세금, 관세', 2, 4),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '込', '', '-こ.む, こ.む, こ.み, -こ.み, こ.める', '붐비다, 혼합', 3, 5),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '額', 'ガク', 'ひたい', '액수, 이마', 2, 6),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '在', 'ザイ', 'あ.る', '존재하다, 교외, 위치하다', 3, 7),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '庫', 'コ, ク', 'くら', '창고', 2, 8),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '販', 'ハン', '', '마케팅, 판매, 무역', 2, 9),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '領', 'リョウ', 'えり', '영토, 관할', 2, 10),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '収', 'シュウ', 'おさ.める, おさ.まる', '수입, 얻다', 3, 11);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'WORD', '値段', 'ねだん', '가격, 비용', 3, 1),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'EXPRESSION', '値引き', 'ねびき', '가격 인하, 할인', 3, 1),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'WORD', '割引', 'わりびき', '할인, 삭감', 3, 2),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'EXPRESSION', '割り勘', 'わりかん', '더치페이, 각자 부담', 1, 2),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'WORD', '返品', 'へんぴん', '반품, 반환', 3, 3),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'EXPRESSION', '先払い', 'さきばらい', '선불, 선급금', 3, 3),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'WORD', '領収書', 'りょうしゅうしょ', '영수증', 2, 4),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'EXPRESSION', '後払い', 'あとばらい', '후불', 3, 4),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'WORD', '在庫', 'ざいこ', '재고', 2, 5),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'WORD', '販売', 'はんばい', '판매, 매출', 2, 6),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'WORD', '現金', 'げんきん', '현금', 3, 7),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'WORD', '支払い', 'しはらい', '지불', 3, 8),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), 'WORD', '予算', 'よさん', '예산', 2, 9);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '値段が高すぎる！', '너무 비싸네요.', 'ねだんがたかすぎる！', 1),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '学生割引はありますか。', '학생 할인이 있어요?', 'がくせいわりびきはありますか。', 2),
    ((SELECT id FROM themes WHERE title = '쇼핑하기'), '現金で支払います。', '현금으로 낼게요.', 'げんきんでしはらいます。', 3);

-- 병원에서 진료받기
INSERT INTO themes (title) VALUES ('병원에서 진료받기') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '병원에서 진료받기');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '병원에서 진료받기');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '병원에서 진료받기');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '症', 'ショウ', '', '증상, 병', 1, 1),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '痛', 'ツウ', 'いた.い, いた.む, いた.ましい, いた.める', '통증, 아픔', 3, 2),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '熱', 'ネツ', 'あつ.い', '열, 온도, 발열', 3, 3),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '薬', 'ヤク', 'くすり', '약, 약품', 3, 4),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '診', 'シン', 'み.る', '검진, 진료, 진단, 진찰', 1, 5),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '療', 'リョウ', '', '치유하다, 낫게 하다', 2, 6),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '治', 'ジ, チ', 'おさ.める, おさ.まる, なお.る, なお.す', '다스리다, 치료하다', 3, 7),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '察', 'サツ', '', '추측하다, 짐작하다', 3, 8),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '傷', 'ショウ', 'きず, いた.む, いた.める', '상처, 부상', 1, 9),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '血', 'ケツ', 'ち', '피, 혈액', 2, 10),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '圧', 'アツ, エン, オウ', 'お.す, へ.す, おさ.える, お.さえる', '압박, 누르다', 2, 11),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '射', 'シャ', 'い.る, さ.す, う.つ', '쏘다, 비치다', 1, 12),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '検', 'ケン', 'しら.べる', '조사, 수사', 1, 13),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '査', 'サ', '', '조사하다', 2, 14);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '診察', 'しんさつ', '진찰, 검진', 1, 1),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'EXPRESSION', '風邪気味', 'かぜぎみ', '가벼운 감기, 감기 기운', 1, 1),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '症状', 'しょうじょう', '증상, 환자의 상태', 1, 2),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'EXPRESSION', '痛み止め', 'いたみどめ', '진통제', 3, 2),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '処方', 'しょほう', '처방, 처방전', 3, 3),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'EXPRESSION', '飲み薬', 'のみぐすり', '내복약', 3, 3),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '薬局', 'やっきょく', '약국', 3, 4),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'EXPRESSION', '診察券', 'しんさつけん', '진료권', 1, 4),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '診断', 'しんだん', '진단', 1, 5),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'EXPRESSION', '問診票', 'もんしんひょう', '문진표', 1, 5),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '治療', 'ちりょう', '치료, 요법', 2, 6),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '検査', 'けんさ', '검사, 점검', 1, 7),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '受付', 'うけつけ', '접수, 접수처', 3, 8),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '保険', 'ほけん', '보험', 1, 9),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '手術', 'しゅじゅつ', '수술', 3, 10),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '注射', 'ちゅうしゃ', '주사', 1, 11),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '副作用', 'ふくさよう', '부작용, 이상 반응', 2, 12),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'WORD', '体温', 'たいおん', '체온', 2, 13);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), '診察券は要らないんですか。', '진찰권은 필요하지 않습니까?', 'しんさつけんはいらないんですか。', 1),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'この近くに薬局はありますか？', '이 근처에 약국 있어요?', 'このちかくにやっきょくはありますか？', 2),
    ((SELECT id FROM themes WHERE title = '병원에서 진료받기'), 'それでは、体温を測りますね。', '그럼 체온을 측정하겠습니다.', 'それでは、たいおんをはかりますね。', 3);

-- 식당에서 식사하기
INSERT INTO themes (title) VALUES ('식당에서 식사하기') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '식당에서 식사하기');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '식당에서 식사하기');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '식당에서 식사하기');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '皿', 'ベイ', 'さら', '접시, 1인분', 2, 1),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '酒', 'シュ', 'さけ, さか-', '사케, 술', 3, 2),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '焼', 'ショウ', 'や.く, や.き, や.き-, -や.き, や.ける', '굽다, 연소', 2, 3),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '揚', 'ヨウ', 'あ.げる, -あ.げ, あ.がる', '올리다, 튀기다', 1, 4),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '煮', 'シャ', 'に.る, -に, に.える, に.やす', '끓이다, 요리하다', 1, 5),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '汁', 'ジュウ', 'しる, -しる, つゆ', '국, 주스, 육수', 1, 6),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '献', 'ケン, コン', 'たてまつ.る', '제물, 선물', 1, 7),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '勘', 'カン', '', '직관, 인식', 1, 8),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '定', 'テイ, ジョウ', 'さだ.める, さだ.まる, さだ.か', '결정하다, 고정하다, 확립하다', 3, 9),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '禁', 'キン', '', '금지, 금하다', 2, 10),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '煙', 'エン', 'けむ.る, けむり, けむ.い', '연기', 3, 11);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '献立', 'こんだて', '메뉴, 식단', 1, 1),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'EXPRESSION', '食べ放題', 'たべほうだい', '마음껏 먹기, 뷔페', 3, 1),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '定食', 'ていしょく', '정식, 오늘의 추천 요리', 3, 2),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'EXPRESSION', '飲み放題', 'のみほうだい', '마음껏 마시기', 3, 2),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '勘定', 'かんじょう', '계산, 요금', 1, 3),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'EXPRESSION', '取り皿', 'とりざら', '개인 접시', 2, 3),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '禁煙', 'きんえん', '금연, 금연 구역', 2, 4),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '相席', 'あいせき', '합석', 3, 5),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '追加', 'ついか', '추가, 보충', 3, 6),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '割り勘', 'わりかん', '더치페이, 각자 내기', 1, 7),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '酒', 'さけ', '술', 3, 8),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '調理', 'ちょうり', '요리, 조리', 3, 9),
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), 'WORD', '味付け', 'あじつけ', '조미, 양념', 3, 10);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '식당에서 식사하기'), '勘定書を頼むよ。', '계산서를 주세요.', 'かんじょうしょをたのむよ。', 1);
