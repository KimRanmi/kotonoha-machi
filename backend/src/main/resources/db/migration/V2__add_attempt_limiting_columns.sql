-- 인증 코드 무차별 대입과 로그인 무차별 대입을 막기 위한 컬럼.
-- verification_attempts: 이메일 인증 코드를 틀리게 입력한 횟수. 기준치를 넘으면 그 코드로는
--   더 이상 인증할 수 없고, 재전송을 받아야 한다(재전송 시 0으로 초기화).
-- login_fail_count / locked_until: 비밀번호를 틀리게 입력한 횟수와, 기준치를 넘었을 때
--   잠기는 시각. 로그인에 성공하면 둘 다 초기화된다.
ALTER TABLE users
    ADD COLUMN verification_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN login_fail_count INT NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMPTZ;
