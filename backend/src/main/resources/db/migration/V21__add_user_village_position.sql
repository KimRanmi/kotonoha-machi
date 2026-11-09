-- 사용자가 마을에서 마지막으로 서 있던 자리. 둘 다 NULL이면 한 번도 저장한 적이 없어 기본 시작 위치에서 시작한다.
ALTER TABLE users
    ADD COLUMN village_x DOUBLE PRECISION,
    ADD COLUMN village_z DOUBLE PRECISION,
    ADD CONSTRAINT ck_users_village_position_pair
        CHECK ((village_x IS NULL) = (village_z IS NULL));
