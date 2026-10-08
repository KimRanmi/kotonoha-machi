-- 로그인(3단계) 전까지는 프론트가 만든 익명 UUID로 사용자를 식별한다.
-- 3단계에서 email/password_hash 컬럼을 추가하고 anonymous_id를 nullable로 바꾼다.
CREATE TABLE users (
    id           BIGSERIAL PRIMARY KEY,
    anonymous_id UUID        NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    villager_id VARCHAR(32) NOT NULL,
    role        VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    translation TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_history ON chat_messages (user_id, villager_id, id);

-- 주민별 누적 대화 횟수(주고받기 1회 = 1). 친밀도 단계는 이 값에서 계산한다.
CREATE TABLE intimacy (
    user_id     BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    villager_id VARCHAR(32) NOT NULL,
    exchanges   INTEGER     NOT NULL DEFAULT 0 CHECK (exchanges >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, villager_id)
);
