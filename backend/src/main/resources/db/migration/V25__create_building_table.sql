-- 마을 건물(위치·크기·색·간판 이름)과 주민의 장소. 값의 원본은 구글 시트이고 scripts/import-buildings,
-- scripts/import-residents 가 만든 upsert SQL로 채운다(이 파일은 구조만 만든다).
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
    location VARCHAR(30) NOT NULL,
    CONSTRAINT uq_building_slug UNIQUE (slug),
    CONSTRAINT uq_building_location UNIQUE (location),
    CONSTRAINT ck_building_size CHECK (width > 0 AND depth > 0 AND height > 0)
);

-- 주민이 지내는 장소(시트의 location 열, 예: 카페·도서관·거리). 같은 이름의 building.location 이 있으면 그 건물에 속한 주민이다.
-- 건물이 없는 장소(예: 거리)나 빈 값은 건물 밖에서 지낸다. 문자열로만 잇기 때문에 두 시트를 따로 가져와도 된다.
ALTER TABLE resident ADD COLUMN location VARCHAR(30);
