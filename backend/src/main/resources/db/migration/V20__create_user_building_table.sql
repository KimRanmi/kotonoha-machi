-- 사용자별로 열린 마을 건물(home, cafe, shop)을 저장한다. 한 번 행이 생기면 유지된다(다시 잠기지 않음).
-- 열림 규칙: home은 가입 직후부터, cafe는 완료한 테마 1개 이상, shop은 3개 이상.
CREATE TABLE user_building (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    building_id VARCHAR(20) NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_building_user_building UNIQUE (user_id, building_id)
);

-- 기존 사용자 백필: 집은 가입 시각으로 연다.
INSERT INTO user_building (user_id, building_id, unlocked_at)
SELECT id, 'home', created_at FROM users;

-- 카페: 완료한 테마가 1개 이상이면 첫 번째 완료 테마의 updated_at으로 연다.
-- 상점: 3개 이상이면 세 번째 완료 테마의 updated_at으로 연다.
INSERT INTO user_building (user_id, building_id, unlocked_at)
SELECT user_id, 'cafe', updated_at
FROM (
    SELECT user_id, updated_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at) AS rn
    FROM theme_progress
    WHERE completed = true
) completed_ranked
WHERE rn = 1;

INSERT INTO user_building (user_id, building_id, unlocked_at)
SELECT user_id, 'shop', updated_at
FROM (
    SELECT user_id, updated_at,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at) AS rn
    FROM theme_progress
    WHERE completed = true
) completed_ranked
WHERE rn = 3;
