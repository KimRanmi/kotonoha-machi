-- 로그인(3단계): 이메일/비밀번호 계정. 익명 사용자(2단계 방식)는 더 이상 만들지 않으므로 anonymous_id는 nullable로 바꾼다.
ALTER TABLE users
    ADD COLUMN email         VARCHAR(255) UNIQUE,
    ADD COLUMN password_hash VARCHAR(100),
    ALTER COLUMN anonymous_id DROP NOT NULL,
    ADD CONSTRAINT users_identity_check CHECK (
        anonymous_id IS NOT NULL OR (email IS NOT NULL AND password_hash IS NOT NULL));
