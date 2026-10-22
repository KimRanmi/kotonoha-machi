-- 로그인/회원가입 기능의 사용자 계정 테이블.
-- 이메일 인증 전에는 status가 PENDING_VERIFICATION이고, 인증 코드를 확인하면 ACTIVE로
-- 바뀐다(verification_code, verification_code_expires_at은 그때 비워진다).
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    verification_code VARCHAR(6),
    verification_code_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_nickname UNIQUE (nickname)
);
