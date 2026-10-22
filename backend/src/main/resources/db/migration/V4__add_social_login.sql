-- 소셜 로그인(구글/카카오/네이버) 지원.
-- password_hash: 소셜 로그인만으로 만들어진 계정은 비밀번호가 없을 수 있어 nullable로 바꾼다.
-- social_accounts: 한 계정에 여러 소셜 제공자를 동시에 연결할 수 있게 User와 분리된 테이블로 둔다
--   (provider, provider_user_id) 조합이 유일해야 같은 소셜 계정이 두 User에 중복 연결되지 않는다.
ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE social_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_social_accounts_provider_user UNIQUE (provider, provider_user_id)
);
