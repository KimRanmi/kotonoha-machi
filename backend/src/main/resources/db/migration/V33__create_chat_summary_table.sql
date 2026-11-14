-- 사용자와 주민의 오래된 대화를 AI가 짧게 줄인 요약 메모. 사용자·주민 쌍마다 한 줄만 둔다.
-- summarized_up_to_id: 이 id 이하의 chat_message는 이미 요약에 반영되었다.
CREATE TABLE chat_summary (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    resident_id BIGINT NOT NULL REFERENCES resident (id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    summarized_up_to_id BIGINT NOT NULL,
    CONSTRAINT uq_chat_summary_user_resident UNIQUE (user_id, resident_id)
);
