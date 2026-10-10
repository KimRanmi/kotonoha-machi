package com.kotonoha.user;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class RefreshTokenRepository {

    public record Stored(long id, long userId, UUID familyId, Instant expiresAt, boolean revoked) {}

    private final JdbcClient jdbc;

    public RefreshTokenRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(long userId, UUID familyId, String tokenHash, Instant expiresAt) {
        jdbc.sql("""
                        INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
                        VALUES (:userId, :familyId, :hash, :expiresAt)""")
                .param("userId", userId)
                .param("familyId", familyId)
                .param("hash", tokenHash)
                .param("expiresAt", java.sql.Timestamp.from(expiresAt))
                .update();
    }

    public Optional<Stored> findByHash(String tokenHash) {
        return jdbc.sql("""
                        SELECT id, user_id, family_id, expires_at, revoked_at IS NOT NULL AS revoked
                        FROM refresh_tokens WHERE token_hash = :hash""")
                .param("hash", tokenHash)
                .query((rs, i) -> new Stored(
                        rs.getLong("id"),
                        rs.getLong("user_id"),
                        rs.getObject("family_id", UUID.class),
                        rs.getTimestamp("expires_at").toInstant(),
                        rs.getBoolean("revoked")))
                .optional();
    }

    // 아직 폐기되지 않은 토큰만 폐기한다. 동시에 같은 토큰으로 갱신하면 한 요청만 true를 받는다.
    public boolean revoke(long id) {
        return jdbc.sql("UPDATE refresh_tokens SET revoked_at = now() WHERE id = :id AND revoked_at IS NULL")
                .param("id", id)
                .update() == 1;
    }

    public void revokeFamily(UUID familyId) {
        jdbc.sql("UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = :familyId AND revoked_at IS NULL")
                .param("familyId", familyId)
                .update();
    }

    // 로그인할 때 이 사용자의 만료된 토큰 행을 정리한다 (별도 스케줄러 없이 테이블이 계속 커지지 않게).
    public void deleteExpired(long userId) {
        jdbc.sql("DELETE FROM refresh_tokens WHERE user_id = :userId AND expires_at < now()")
                .param("userId", userId)
                .update();
    }
}
