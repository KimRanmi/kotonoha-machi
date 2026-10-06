package com.kotonoha.user;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // 동시에 같은 익명 ID로 첫 요청이 와도 안전하도록 upsert 한 번으로 처리한다.
    public long findOrCreateByAnonymousId(UUID anonymousId) {
        return jdbc.sql("""
                        INSERT INTO users (anonymous_id) VALUES (:anonymousId)
                        ON CONFLICT (anonymous_id) DO UPDATE SET anonymous_id = EXCLUDED.anonymous_id
                        RETURNING id""")
                .param("anonymousId", anonymousId)
                .query(Long.class)
                .single();
    }
}
