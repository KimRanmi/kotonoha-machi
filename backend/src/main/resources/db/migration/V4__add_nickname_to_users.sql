-- 닉네임: 주민들이 사용자를 부르는 이름. 대소문자 구분 없이 중복을 허용하지 않는다.
-- 닉네임 도입 전에 가입한 계정은 NULL이며, 로그인 후 프론트가 설정 화면으로 보낸다.
ALTER TABLE users ADD COLUMN nickname VARCHAR(30);

CREATE UNIQUE INDEX users_nickname_lower_idx ON users (lower(nickname)) WHERE nickname IS NOT NULL;
