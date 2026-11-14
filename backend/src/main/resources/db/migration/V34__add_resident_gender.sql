-- 주민 성별. 대화 프롬프트(말투)와 음성(여성/남성 목소리)을 정하는 데 쓴다. M: 남성, F: 여성.
-- 값은 scripts/import-residents 가 구글 시트의 gender 열(남/여)에서 채운다. 비어 있으면 NULL.
ALTER TABLE resident ADD COLUMN gender VARCHAR(1) CHECK (gender IN ('M', 'F'));
