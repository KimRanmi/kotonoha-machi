package com.kotonoha.chat;

import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class ChatRepository {

    // 한 번에 돌려주는 최대 기록 수 (가장 최근 것부터 자른다).
    static final int HISTORY_LIMIT = 500;

    private final JdbcClient jdbc;

    public ChatRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(long userId, String villagerId, String role, String content, String translation) {
        jdbc.sql("""
                        INSERT INTO chat_messages (user_id, villager_id, role, content, translation)
                        VALUES (:userId, :villagerId, :role, :content, :translation)""")
                .param("userId", userId)
                .param("villagerId", villagerId)
                .param("role", role)
                .param("content", content)
                .param("translation", translation)
                .update();
    }

    // 오래된 순으로 돌려준다.
    public List<ChatMessageRecord> history(long userId, String villagerId) {
        return jdbc.sql("""
                        SELECT id, role, content, translation, created_at FROM (
                            SELECT id, role, content, translation, created_at
                            FROM chat_messages
                            WHERE user_id = :userId AND villager_id = :villagerId
                            ORDER BY id DESC LIMIT :limit
                        ) recent ORDER BY id""")
                .param("userId", userId)
                .param("villagerId", villagerId)
                .param("limit", HISTORY_LIMIT)
                .query((rs, i) -> new ChatMessageRecord(
                        String.valueOf(rs.getLong("id")),
                        rs.getString("role"),
                        rs.getString("content"),
                        rs.getString("translation"),
                        rs.getTimestamp("created_at").getTime()))
                .list();
    }
}
