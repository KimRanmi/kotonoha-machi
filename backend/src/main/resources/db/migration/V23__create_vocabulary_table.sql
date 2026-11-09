-- 사용자별 학습 단어장. 테마 학습에서 배운 단어(THEME)와 대화 중 저장한 단어(CHAT)가 함께 쌓인다.
-- 뜻·읽는 법·JLPT 레벨은 사전 데이터에서 복사해 오며, 같은 사용자가 같은 표기+읽는 법을 중복 저장하지 못한다.
CREATE TABLE user_vocabulary (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    surface_form VARCHAR(100) NOT NULL,
    reading VARCHAR(100) NOT NULL,
    meaning VARCHAR(300) NOT NULL,
    jlpt_level INT,
    source VARCHAR(20) NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_vocabulary_user_word UNIQUE (user_id, surface_form, reading)
);
