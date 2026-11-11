-- 친밀도를 하루에 올릴 수 있는 양을 제한하기 위한 열.
-- last_gain_date는 마지막으로 친밀도가 오른 날(한국 시간), today_gain은 그날 이미 오른 양이다.
ALTER TABLE resident_friendship
    ADD COLUMN today_gain INT NOT NULL DEFAULT 0,
    ADD COLUMN last_gain_date DATE,
    ADD CONSTRAINT ck_resident_friendship_today_gain CHECK (today_gain >= 0);
