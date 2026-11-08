-- 마을 주민(NPC)과 사용자별 친밀도. 주민은 시드 데이터로 넣고, 친밀도 행이 없으면 0으로 취급한다.
CREATE TABLE resident (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    personality VARCHAR(30) NOT NULL,
    current_context VARCHAR(300) NOT NULL
);

CREATE TABLE resident_friendship (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    resident_id BIGINT NOT NULL REFERENCES resident (id) ON DELETE CASCADE,
    level INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_resident_friendship_user_resident UNIQUE (user_id, resident_id),
    CONSTRAINT ck_resident_friendship_level CHECK (level BETWEEN 0 AND 100)
);

INSERT INTO resident (name, personality, current_context) VALUES
    ('ミユ', '친절', '자신이 운영하는 카페의 카운터 안쪽에서 커피를 내리며 손님을 맞이하고 있다.'),
    ('ナナ', '활발', '카페 홀을 돌아다니며 테이블을 닦고 주문을 받는 아르바이트 중이다.');
