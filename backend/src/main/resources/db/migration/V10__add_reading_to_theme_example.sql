-- REVIEW 단계(발음 체크)에서 사용자가 말한 내용을 정답과 비교할 때, 음성 인식 결과가 같은 발음을
-- 한자로 인식할 수도, 가나로 인식할 수도 있다. 한자·단어·표현은 이미 읽는 법(on_reading/kun_reading,
-- reading) 컬럼이 있어 한자 표기와 읽는 법 둘 다와 비교할 수 있지만, 예문(theme_example)만 읽는
-- 법이 없어서 똑같이 비교할 수 없었다. 예문에도 읽는 법 컬럼을 추가해 맞춘다.
--
-- 기존 예문 4개의 읽는 법은 그 문장을 그대로 음독한 결과를 사람이 직접 확인해 적어 넣었다 —
-- AI가 새 문장이나 뜻을 지어낸 게 아니라 이미 있는 문장의 발음을 받아적은 것이다.
ALTER TABLE theme_example ADD COLUMN reading VARCHAR(300);

UPDATE theme_example SET reading = 'そのくすりはにがいあじがするんだ。'
    WHERE japanese_sentence = 'その薬は苦い味がするんだ。';
UPDATE theme_example SET reading = 'トムはあまいものだいじょうぶ？'
    WHERE japanese_sentence = 'トムは甘いもの大丈夫？';
UPDATE theme_example SET reading = 'どのくらいのきょりですか。'
    WHERE japanese_sentence = 'どのくらいの距離ですか。';
UPDATE theme_example SET reading = 'どうろをわたるときはちゅういしなければなりません。'
    WHERE japanese_sentence = '道路を渡るときは注意しなければなりません。';

ALTER TABLE theme_example ALTER COLUMN reading SET NOT NULL;
