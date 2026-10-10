-- refresh 토큰은 원문을 저장하지 않고 SHA-256 해시만 저장한다 (DB가 유출돼도 토큰을 쓸 수 없도록).
-- family_id: 한 번의 로그인에서 갱신(rotation)으로 이어진 토큰들의 묶음. 이미 쓴 토큰이 재사용되면 묶음 전체를 폐기한다.
CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    family_id  UUID        NOT NULL,
    token_hash CHAR(64)    NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
