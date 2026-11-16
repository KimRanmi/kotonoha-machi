-- 테마 학습 콘텐츠. 구글 시트(kotonoha-machi 테마 콘텐츠)에서 사람이 검수(review=ok)한 행을
-- scripts/import-theme-content의 import-sheet.mjs가 kanjiapi.dev와 대조한 뒤 만들었다.
-- 테마별로 기존 내용을 지우고 다시 넣는다(같은 테마를 시트에서 고쳐 새 버전으로 반영할 수 있음).

-- 학교에서 공부하기
INSERT INTO themes (title) VALUES ('학교에서 공부하기') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '학교에서 공부하기');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '학교에서 공부하기');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '학교에서 공부하기');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '授', 'ジュ', 'さず.ける, さず.かる', '전하다, 가르치다, 수여하다', 1, 1),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '宿', 'シュク', 'やど, やど.る, やど.す', '여관, 숙소, 머물다', 3, 2),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '講', 'コウ', '', '강의, 클럽, 협회', 2, 3),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '義', 'ギ', '', '정의, 도덕, 명예', 1, 4),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '課', 'カ', '', '장, 과, 부서', 2, 5),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '程', 'テイ', 'ほど, -ほど', '정도, 법률, 거리', 3, 6),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '卒', 'ソツ, シュツ', 'そっ.する, お.える, お.わる, ついに, にわか', '졸업하다, 병사', 2, 7),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '績', 'セキ', '', '공적, 업적', 2, 8),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '欠', 'ケツ, ケン', 'か.ける, か.く', '부족, 간격, 실패', 3, 9),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '提', 'テイ, チョウ, ダイ', 'さ.げる', '제안하다, 지참하다, 휴대하다', 1, 10),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '復', 'フク', 'また', '복원하다, 돌아가다, 되돌아가다', 2, 11);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '授業', 'じゅぎょう', '수업, 가르침, 학과', 1, 1),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'EXPRESSION', '遅刻', 'ちこく', '지각, 늦음', 3, 1),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '宿題', 'しゅくだい', '과제, 미해결 문제', 3, 2),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'EXPRESSION', '居残り', 'いのこり', '방과 후 남기', 3, 2),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '成績', 'せいせき', '실적, 기록, 성적', 2, 3),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'EXPRESSION', '学期', 'がっき', '학기', 3, 3),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '欠席', 'けっせき', '결석, 부재', 3, 4),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'EXPRESSION', '点数', 'てんすう', '점수, 성적, 득점', 3, 4),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '出席', 'しゅっせき', '출석, 참석', 3, 5),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '教科書', 'きょうかしょ', '교과서, 교재', 3, 6),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '講義', 'こうぎ', '강의', 1, 7),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '課題', 'かだい', '주제, 과제, 문제', 2, 8),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '卒業', 'そつぎょう', '졸업, 수료', 2, 9),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '提出', 'ていしゅつ', '제출, 제시, 신고', 1, 10),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '復習', 'ふくしゅう', '복습', 2, 11),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '予習', 'よしゅう', '예습', 3, 12),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'WORD', '時間割', 'じかんわり', '시간표, 스케줄', 3, 13);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '授業は午前８時３０分に始まる。', '수업은 오전 8시 30분에 시작한다.', 'じゅぎょうはごぜんはちじさんぜろふんにはじまる。', 1),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '宿題、済んだ？', '숙제 다 끝냈니?', 'しゅくだい、すんだ？', 2),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), 'トムは今日欠席ですか？', '톰은 오늘 결석이에요?', 'とむはきょうけっせきですか？', 3),
    ((SELECT id FROM themes WHERE title = '학교에서 공부하기'), '教科書を開いてください。', '교과서를 펴세요.', 'きょうかしょをひらいてください。', 4);

-- 우체국에서 편지 보내기
INSERT INTO themes (title) VALUES ('우체국에서 편지 보내기') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '우체국에서 편지 보내기');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '우체국에서 편지 보내기');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '우체국에서 편지 보내기');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '郵', 'ユウ', '', '우편, 역참', 2, 1),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '便', 'ベン, ビン', 'たよ.り', '편의, 편지, 기회', 3, 2),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '局', 'キョク', 'つぼね', '국, 사무실, 업무', 3, 3),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '届', 'カイ', 'とど.ける, -とど.け, とど.く', '배달하다, 도달하다, 알리다', 2, 4),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '封', 'フウ, ホウ', '', '봉인, 마감', 2, 5),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '筒', 'トウ', 'つつ', '통, 파이프, 관', 2, 6),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '差', 'サ', 'さ.す, さ.し', '구별, 차이, 여유, 잔액', 3, 7),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '配', 'ハイ', 'くば.る', '배분, 배급', 3, 8),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '達', 'タツ, ダ', '-たち', '달성한, 도달하다, 이르다', 3, 9),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '荷', 'カ', 'に', '짐, 부담, 화물', 2, 10),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '包', 'ホウ', 'つつ.む, くる.む', '싸다, 포장하다, 감싸다, 숨기다', 2, 11),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '航', 'コウ', '', '항해하다, 항행하다, 비행하다', 2, 12),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), '量', 'リョウ', 'はか.る', '량, 측정, 무게, 추정하다', 2, 13);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '郵便', 'ゆうびん', '우편 서비스, 우편, 우편물', 2, 1),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'EXPRESSION', '着払い', 'ちゃくばらい', '착불, 대금 상환', 3, 1),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '配達', 'はいたつ', '배달', 3, 2),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'EXPRESSION', '元払い', 'もとばらい', '선불', 3, 2),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '速達', 'そくたつ', '특급, 속달', 3, 3),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'EXPRESSION', '宅配便', 'たくはいびん', '택배 서비스, 택배', 3, 3),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '書留', 'かきとめ', '등기 우편, 등기, 기록', 3, 4),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'EXPRESSION', '書留郵便', 'かきとめゆうびん', '등기 우편', 2, 4),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '小包', 'こづつみ', '소포, 꾸러미', 2, 5),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'EXPRESSION', '普通郵便', 'ふつうゆうびん', '일반 우편', 2, 5),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '荷物', 'にもつ', '수하물, 짐, 부담', 2, 6),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'EXPRESSION', '引っ越し', 'ひっこし', '이사, 거주지 변경', 3, 6),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '航空便', 'こうくうびん', '항공 우편, 항공 운송', 2, 7),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '差出人', 'さしだしにん', '발송인', 3, 8),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '受取人', 'うけとりにん', '수취인, 수신인, 수혜자', 3, 9),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '住所', 'じゅうしょ', '주소, 거주지, 본적', 3, 10),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '郵便番号', 'ゆうびんばんごう', '우편번호', 2, 11),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'WORD', '封筒', 'ふうとう', '봉투', 2, 12);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'この手紙を書留にしてほしいんです。', '이 편지를 등기로 보내고 싶어요.', 'このてがみをかきとめにしてほしいんです。', 1),
    ((SELECT id FROM themes WHERE title = '우체국에서 편지 보내기'), 'お預けになる荷物はございますか。', '맡기실 짐은 있으십니까?', 'おあずけになるにもつはございますか。', 2);

-- 날씨와 계절 이야기하기
INSERT INTO themes (title) VALUES ('날씨와 계절 이야기하기') ON CONFLICT (title) DO NOTHING;
DELETE FROM theme_kanji WHERE theme_id = (SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기');
DELETE FROM theme_vocabulary WHERE theme_id = (SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기');
DELETE FROM theme_example WHERE theme_id = (SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기');

INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '晴', 'セイ', 'は.れる, は.れ, は.れ-, -ば.れ, は.らす', '개다', 3, 1),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '曇', 'ドン', 'くも.る', '흐린 날씨, 흐려지다', 2, 2),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '雪', 'セツ', 'ゆき', '눈', 3, 3),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '雷', 'ライ', 'かみなり, いかずち, いかづち', '천둥, 번개', 1, 4),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '嵐', 'ラン', 'あらし', '폭풍, 폭풍우', 1, 5),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '暑', 'ショ', 'あつ.い', '무더운, 더위, 여름 더위', 1, 6),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '寒', 'カン', 'さむ.い', '추위', 3, 7),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '涼', 'リョウ', 'すず.しい, すず.む, すず.やか, うす.い, ひや.す, まことに', '상쾌한, 시원하고 좋은', 2, 8),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '温', 'オン', 'あたた.か, あたた.かい, あたた.まる, あたた.める, ぬく', '따뜻한', 2, 9),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '湿', 'シツ, シュウ', 'しめ.る, しめ.す, うるお.う, うるお.す', '축축한, 젖은, 습한', 2, 10),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '季', 'キ', '', '계절', 2, 11),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '節', 'セツ, セチ', 'ふし, -ぶし, のっと', '마디, 계절, 기간, 절', 1, 12),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '梅', 'バイ', 'うめ', '매화, 자두', 1, 13),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '予', 'ヨ, シャ', 'あらかじ.め', '사전에, 이전의', 3, 14),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '報', 'ホウ', 'むく.いる', '보고, 소식, 보답', 3, 15),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '傘', 'サン', 'かさ', '우산', 1, 16),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '濃', 'ノウ', 'こ.い', '진한, 걸쭉한, 짙은', 2, 17),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '霧', 'ム, ボウ, ブ', 'きり', '안개', 1, 18);

INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '予報', 'よほう', '예보, 예측', 3, 1),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'EXPRESSION', '蒸し暑い', 'むしあつい', '습한, 무더운', 1, 1),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '気温', 'きおん', '기온', 2, 2),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'EXPRESSION', '肌寒い', 'はださむい', '쌀쌀한, 불쾌하게 찬', 2, 2),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '湿度', 'しつど', '습도', 2, 3),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'EXPRESSION', '雨宿り', 'あまやどり', '비 피하기', 3, 3),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '梅雨', 'つゆ', '장마, 장마철 비', 1, 4),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'EXPRESSION', '天気予報', 'てんきよほう', '일기예보, 기상 통보', 3, 4),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '季節', 'きせつ', '계절, 연중 시기', 1, 5),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'EXPRESSION', '梅雨明け', 'つゆあけ', '장마 끝', 1, 5),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '猛暑', 'もうしょ', '폭염, 맹렬한 더위', 1, 6),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'EXPRESSION', '日差し', 'ひざし', '햇빛, 태양 광선', 3, 6),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '快晴', 'かいせい', '맑은 날씨, 구름 없는 날씨, 좋은 날씨', 2, 7),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '洪水', 'こうずい', '홍수, 범람', 1, 8),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '気候', 'きこう', '기후', 3, 9),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '天候', 'てんこう', '날씨', 3, 10),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '降水', 'こうすい', '강우, 강수', 3, 11),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), 'WORD', '寒波', 'かんぱ', '한파', 2, 12);

INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)
VALUES
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '天気予報はどうですか？', '일기 예보는 어떻습니까?', 'てんきよほうはどうですか？', 1),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '気温は上がっています。', '온도가 올라가고 있다.', 'きおんはあがっています。', 2),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '湿度がすごく高いですね。', '습도가 매우 높네요.', 'しつどがすごくたかいですね。', 3),
    ((SELECT id FROM themes WHERE title = '날씨와 계절 이야기하기'), '梅雨に入った。', '장마철이 시작되었어요.', 'つゆにはいった。', 4);
