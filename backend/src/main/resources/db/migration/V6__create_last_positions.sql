-- 마지막 위치 이어하기: 사용자당 한 줄. 다시 접속하면 이 자리에서 시작한다.
-- place는 'town'(마을) 또는 건물 id(예: cafe, theme-1730000000000). x/y는 그 장소 안의 월드 좌표(캐릭터 좌상단).
-- 앉아 있던 상태나 진행 중이던 주문은 저장하지 않는다 (좌표만 복원).
CREATE TABLE last_positions (
    user_id    BIGINT           NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    place      VARCHAR(64)      NOT NULL,
    x          DOUBLE PRECISION NOT NULL,
    y          DOUBLE PRECISION NOT NULL,
    updated_at TIMESTAMPTZ      NOT NULL DEFAULT now()
);
