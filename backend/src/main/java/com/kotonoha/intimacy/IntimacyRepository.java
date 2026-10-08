package com.kotonoha.intimacy;

import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class IntimacyRepository {

    private final JdbcClient jdbc;

    public IntimacyRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public int exchanges(long userId, String villagerId) {
        return jdbc.sql("SELECT exchanges FROM intimacy WHERE user_id = :userId AND villager_id = :villagerId")
                .param("userId", userId)
                .param("villagerId", villagerId)
                .query(Integer.class)
                .optional()
                .orElse(0);
    }

    // 동시 요청에서도 카운트가 유실되지 않도록 DB에서 원자적으로 +1 한다.
    public void increment(long userId, String villagerId) {
        jdbc.sql("""
                        INSERT INTO intimacy (user_id, villager_id, exchanges) VALUES (:userId, :villagerId, 1)
                        ON CONFLICT (user_id, villager_id)
                        DO UPDATE SET exchanges = intimacy.exchanges + 1, updated_at = now()""")
                .param("userId", userId)
                .param("villagerId", villagerId)
                .update();
    }

    // villagerId -> 누적 대화 횟수
    public Map<String, Integer> all(long userId) {
        return jdbc.sql("SELECT villager_id, exchanges FROM intimacy WHERE user_id = :userId")
                .param("userId", userId)
                .query((rs, i) -> Map.entry(rs.getString("villager_id"), rs.getInt("exchanges")))
                .list().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }
}
