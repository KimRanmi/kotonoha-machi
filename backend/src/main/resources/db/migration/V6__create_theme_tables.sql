-- 테마 학습의 단계 진행 게이트(한자 → 단어 → 표현 → 예문 → 독해)를 위한 테이블.
-- themes.title은 지금은 식별용 제목만 있고, 실제 한자/단어/표현/예문/독해 콘텐츠는 아직
-- 별도로 설계되지 않았다(다음 작업에서 다룬다). 테마 두 개를 샘플로 시드해 둔다.
CREATE TABLE themes (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    CONSTRAINT uq_themes_title UNIQUE (title)
);

-- 사용자별로 테마 하나를 얼마나 진행했는지 저장한다. current_stage는 지금 진행해야 할
-- 단계이고, completed는 독해까지 끝냈는지 여부다.
CREATE TABLE theme_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id),
    theme_id BIGINT NOT NULL REFERENCES themes (id),
    current_stage VARCHAR(20) NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_theme_progress_user_theme UNIQUE (user_id, theme_id)
);

INSERT INTO themes (title) VALUES ('카페에서 주문하기'), ('길 묻기');
