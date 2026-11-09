-- 마을 마지막 위치를 users에서 떼어 별도 표로 옮긴다. 위치는 자주 바뀌는 값이라 로그인·프로필이 쓰는 users 행과 섞지 않는다.
-- 행이 없으면 저장한 적이 없는 사용자다.
CREATE TABLE user_village_position (
    user_id BIGINT PRIMARY KEY REFERENCES users (id),
    x DOUBLE PRECISION NOT NULL,
    z DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- V21로 users에 이미 저장된 위치를 옮긴다.
INSERT INTO user_village_position (user_id, x, z)
SELECT id, village_x, village_z
FROM users
WHERE village_x IS NOT NULL AND village_z IS NOT NULL;

ALTER TABLE users
    DROP CONSTRAINT ck_users_village_position_pair,
    DROP COLUMN village_x,
    DROP COLUMN village_z;
