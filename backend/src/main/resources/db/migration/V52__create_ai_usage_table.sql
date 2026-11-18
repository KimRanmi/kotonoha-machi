-- Gemini 호출 기록. 호출 한 번당 한 줄이고, 프롬프트·대화 내용은 저장하지 않는다(종류·모델·토큰 수·결과만).
-- 사용자가 탈퇴해도 비용 집계가 남도록 user_id는 지워지면 NULL로 둔다.
CREATE TABLE ai_usage (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users (id) ON DELETE SET NULL,
    call_type VARCHAR(20) NOT NULL,
    model VARCHAR(100) NOT NULL,
    -- 입력 토큰 수. 응답에 사용량이 없으면 NULL.
    input_tokens INTEGER,
    -- 출력 토큰 수(추론 토큰 포함: 추론 토큰도 출력 단가로 청구된다). 응답에 사용량이 없으면 NULL.
    output_tokens INTEGER,
    success BOOLEAN NOT NULL,
    -- 실패했을 때 Google이 돌려준 HTTP 상태 코드(네트워크 오류 등은 NULL).
    error_status INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_ai_usage_call_type CHECK (call_type IN ('CHAT', 'SUMMARY', 'TRANSLATE'))
);

CREATE INDEX idx_ai_usage_created_at ON ai_usage (created_at);
