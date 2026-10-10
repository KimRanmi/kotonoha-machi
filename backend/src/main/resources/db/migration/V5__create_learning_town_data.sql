-- 4단계: localStorage에 있던 학습 단어/건물/내 집 데이터를 서버로 옮긴다.
-- 모든 행은 user_id(users.id)에 묶이고, 사용자가 삭제되면 함께 지워진다.
-- 시각 컬럼은 프론트가 쓰던 epoch millis(BIGINT) 그대로 두어 변환을 없앴다 (서버 시각으로 채운다).

-- 학습 단어 목록 (사용자별 단어 중복 없음)
CREATE TABLE learned_words (
    user_id  BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    word     VARCHAR(100) NOT NULL,
    added_at BIGINT       NOT NULL,
    PRIMARY KEY (user_id, word)
);

-- 완료한 테마. 건물은 테마를 "처음" 완료할 때만 생기므로, 이 PK 충돌 여부가 곧 첫 완료 판정이다.
CREATE TABLE completed_themes (
    user_id      BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    theme_title  VARCHAR(100) NOT NULL,
    completed_at BIGINT       NOT NULL,
    PRIMARY KEY (user_id, theme_title)
);

-- 배치 대기 건물: 첫 완료했지만 아직 마을에 놓지 않은 건물. 사용자당 1건(기존 동작과 동일), 배치하면 지운다.
CREATE TABLE pending_buildings (
    user_id      BIGINT       NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    theme_title  VARCHAR(100) NOT NULL,
    completed_at BIGINT       NOT NULL
);

-- 마을에 배치한 테마 건물. id는 "theme-<completed_at>" (프론트가 쓰던 id 형식 그대로).
-- 주민 연결(residentId 등)은 theme_title에서 프론트가 계산하므로 저장하지 않는다.
CREATE TABLE placed_buildings (
    user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    id          VARCHAR(64)  NOT NULL,
    theme_title VARCHAR(100) NOT NULL,
    x           DOUBLE PRECISION NOT NULL,
    y           DOUBLE PRECISION NOT NULL,
    width       DOUBLE PRECISION NOT NULL,
    height      DOUBLE PRECISION NOT NULL,
    label       VARCHAR(100) NOT NULL,
    color       VARCHAR(16)  NOT NULL,
    placed_at   BIGINT       NOT NULL,
    PRIMARY KEY (user_id, id)
);

-- 내 집: 사용자당 1행. 위치는 온보딩에서 한 번 정해지고, 가구 배치(placed/stored)는 항상 통째로
-- 읽고 쓰는 값이라 jsonb 한 컬럼으로 둔다 (가구를 개별 행으로 쪼개면 얻는 게 없고 저장만 복잡해진다).
-- furniture가 NULL이면 아직 한 번도 꾸미지 않은 것 (프론트가 기본 가구로 시작).
CREATE TABLE homes (
    user_id   BIGINT           NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    x         DOUBLE PRECISION NOT NULL,
    y         DOUBLE PRECISION NOT NULL,
    furniture JSONB
);

-- 끝낸 온보딩 단계 (단계 목록 자체는 프론트 app/onboarding.ts에 있다)
CREATE TABLE onboarding_steps (
    user_id BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    step    VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, step)
);
