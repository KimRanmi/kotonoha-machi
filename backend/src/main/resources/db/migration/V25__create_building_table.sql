-- 마을 건물(집·카페·상점)의 위치·크기·색·간판 이름. 원본은 구글 시트이고 scripts/import-buildings 가 이후 변경을 upsert SQL로 만든다.
-- 건물은 테마 완료와 무관하게 모두 처음부터 열려 있어서 사용자별 상태는 두지 않는다.
CREATE TABLE building (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(20) NOT NULL,
    label VARCHAR(20) NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    z DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    depth DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL,
    color VARCHAR(7) NOT NULL,
    CONSTRAINT uq_building_slug UNIQUE (slug),
    CONSTRAINT ck_building_size CHECK (width > 0 AND depth > 0 AND height > 0)
);

INSERT INTO building (slug, label, x, z, width, depth, height, color) VALUES
    ('home', 'わが家', 10, -4, 4, 4, 2.2, '#E8C07D'),
    ('cafe', 'カフェ', -8, -4, 5, 4, 2.5, '#C97B4A'),
    ('shop', 'お店', 2, -10, 5, 4, 2.5, '#8FA7C4');

-- 주민이 주로 일하는(속한) 건물. 비어 있으면 소속 없이 마을에서 지낸다. 한 건물에 여러 주민이 속할 수 있다.
ALTER TABLE resident ADD COLUMN work_building VARCHAR(20) REFERENCES building (slug);

UPDATE resident SET work_building = 'cafe' WHERE slug = 'r05';
UPDATE resident SET work_building = 'shop' WHERE slug = 'r03';
