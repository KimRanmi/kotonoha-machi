-- 비밀번호 찾기/재설정 기능용 컬럼. 이메일 인증 코드(verification_code 등)와는 별개의
-- 코드/만료시각/시도횟수를 쓴다 — 두 기능이 같은 컬럼을 공유하면 한쪽을 처리하다가 다른
-- 쪽 상태를 실수로 건드리기 쉬워서 분리했다.
ALTER TABLE users
    ADD COLUMN password_reset_code VARCHAR(6),
    ADD COLUMN password_reset_code_expires_at TIMESTAMPTZ,
    ADD COLUMN password_reset_attempts INT NOT NULL DEFAULT 0;
