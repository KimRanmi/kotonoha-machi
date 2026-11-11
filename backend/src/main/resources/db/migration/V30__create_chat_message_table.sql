-- 사용자와 주민 사이의 대화 기록. 플레이어의 말과 주민의 대답을 한 줄씩 저장한다.
CREATE TABLE chat_message (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    resident_id BIGINT NOT NULL REFERENCES resident (id) ON DELETE CASCADE,
    speaker VARCHAR(10) NOT NULL,
    text TEXT NOT NULL,
    translation TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_chat_message_speaker CHECK (speaker IN ('PLAYER', 'RESIDENT'))
);

CREATE INDEX idx_chat_message_user_resident ON chat_message (user_id, resident_id, id);
