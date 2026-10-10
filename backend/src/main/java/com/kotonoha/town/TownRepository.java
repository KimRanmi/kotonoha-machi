package com.kotonoha.town;

import com.kotonoha.common.ApiException;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

// 테마 완료 / 배치 대기 건물 / 배치한 건물 / 내 집 / 온보딩. 모든 쿼리는 user_id 조건으로만 접근한다.
@Repository
public class TownRepository {

    private final JdbcClient jdbc;

    public TownRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // ---- 테마 ----

    public List<String> completedThemes(long userId) {
        return jdbc.sql("SELECT theme_title FROM completed_themes WHERE user_id = :userId ORDER BY completed_at")
                .param("userId", userId)
                .query(String.class)
                .list();
    }

    // 테마 완료를 기록한다. 처음이면 배치 대기 건물도 같은 트랜잭션에서 만들고 true,
    // 이미 완료한 테마(복습)면 아무것도 바꾸지 않고 false.
    @Transactional
    public boolean completeTheme(long userId, String themeTitle) {
        long now = System.currentTimeMillis();
        int inserted = jdbc.sql("""
                        INSERT INTO completed_themes (user_id, theme_title, completed_at) VALUES (:userId, :title, :now)
                        ON CONFLICT (user_id, theme_title) DO NOTHING""")
                .param("userId", userId)
                .param("title", themeTitle)
                .param("now", now)
                .update();
        if (inserted == 0) return false;
        // 기존 동작과 같이 대기 건물은 사용자당 1건이고, 새로 완료하면 덮어쓴다.
        jdbc.sql("""
                        INSERT INTO pending_buildings (user_id, theme_title, completed_at) VALUES (:userId, :title, :now)
                        ON CONFLICT (user_id) DO UPDATE SET theme_title = :title, completed_at = :now""")
                .param("userId", userId)
                .param("title", themeTitle)
                .param("now", now)
                .update();
        return true;
    }

    // ---- 건물 ----

    public Optional<PendingBuilding> pendingBuilding(long userId) {
        return jdbc.sql("SELECT theme_title, completed_at FROM pending_buildings WHERE user_id = :userId")
                .param("userId", userId)
                .query((rs, i) -> new PendingBuilding(rs.getString("theme_title"), rs.getLong("completed_at")))
                .optional();
    }

    public List<PlacedBuilding> placedBuildings(long userId) {
        return jdbc.sql("""
                        SELECT id, theme_title, x, y, width, height, label, color, placed_at
                        FROM placed_buildings WHERE user_id = :userId ORDER BY placed_at, id""")
                .param("userId", userId)
                .query((rs, i) -> new PlacedBuilding(rs.getString("id"), rs.getString("theme_title"),
                        rs.getDouble("x"), rs.getDouble("y"), rs.getDouble("width"), rs.getDouble("height"),
                        rs.getString("label"), rs.getString("color"), rs.getLong("placed_at")))
                .list();
    }

    // 배치 대기 건물을 주어진 자리에 놓는다. 대기 건물 삭제와 배치가 한 트랜잭션이라 두 번 눌러도 한 채만 생긴다.
    @Transactional
    public PlacedBuilding placePending(long userId, BuildingController.PlaceRequest r) {
        PendingBuilding pending = jdbc.sql("""
                        DELETE FROM pending_buildings WHERE user_id = :userId
                        RETURNING theme_title, completed_at""")
                .param("userId", userId)
                .query((rs, i) -> new PendingBuilding(rs.getString("theme_title"), rs.getLong("completed_at")))
                .optional()
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "배치할 건물이 없습니다."));
        PlacedBuilding building = new PlacedBuilding("theme-" + pending.completedAt(), pending.themeTitle(),
                r.x(), r.y(), r.width(), r.height(), r.label(), r.color(), System.currentTimeMillis());
        jdbc.sql("""
                        INSERT INTO placed_buildings (user_id, id, theme_title, x, y, width, height, label, color, placed_at)
                        VALUES (:userId, :id, :title, :x, :y, :width, :height, :label, :color, :placedAt)""")
                .param("userId", userId)
                .param("id", building.id())
                .param("title", building.themeTitle())
                .param("x", building.x())
                .param("y", building.y())
                .param("width", building.width())
                .param("height", building.height())
                .param("label", building.label())
                .param("color", building.color())
                .param("placedAt", building.placedAt())
                .update();
        return building;
    }

    // ---- 내 집 ----

    public Optional<HomePosition> homePosition(long userId) {
        return jdbc.sql("SELECT x, y FROM homes WHERE user_id = :userId")
                .param("userId", userId)
                .query((rs, i) -> new HomePosition(rs.getDouble("x"), rs.getDouble("y")))
                .optional();
    }

    // 위치만 바꾸고 가구는 건드리지 않는다. 같은 요청을 다시 보내도 결과가 같다(재시도 안전).
    public void saveHomePosition(long userId, HomePosition p) {
        jdbc.sql("""
                        INSERT INTO homes (user_id, x, y) VALUES (:userId, :x, :y)
                        ON CONFLICT (user_id) DO UPDATE SET x = :x, y = :y""")
                .param("userId", userId)
                .param("x", p.x())
                .param("y", p.y())
                .update();
    }

    // 저장된 가구 배치(JSON 문자열). 내 집이 없거나 아직 꾸민 적이 없으면 비어 있다.
    public Optional<String> homeFurniture(long userId) {
        return jdbc.sql("SELECT furniture::text FROM homes WHERE user_id = :userId AND furniture IS NOT NULL")
                .param("userId", userId)
                .query(String.class)
                .optional();
    }

    public void saveHomeFurniture(long userId, String furnitureJson) {
        int updated = jdbc.sql("UPDATE homes SET furniture = CAST(:f AS jsonb) WHERE user_id = :userId")
                .param("userId", userId)
                .param("f", furnitureJson)
                .update();
        if (updated == 0) throw new ApiException(HttpStatus.CONFLICT, "내 집이 아직 없습니다.");
    }

    // ---- 온보딩 ----

    public List<String> onboardingDone(long userId) {
        return jdbc.sql("SELECT step FROM onboarding_steps WHERE user_id = :userId ORDER BY step")
                .param("userId", userId)
                .query(String.class)
                .list();
    }

    public void markOnboardingDone(long userId, String step) {
        jdbc.sql("INSERT INTO onboarding_steps (user_id, step) VALUES (:userId, :step) ON CONFLICT DO NOTHING")
                .param("userId", userId)
                .param("step", step)
                .update();
    }
}
