package com.kotonoha.user;

import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    public record Account(long id, String email, String passwordHash, String nickname) {}

    public record Profile(String email, String nickname) {}

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // 이메일 또는 닉네임이 이미 있으면 DuplicateKeyException (각각 UNIQUE).
    public long create(String email, String passwordHash, String nickname) throws DuplicateKeyException {
        return jdbc.sql("""
                        INSERT INTO users (email, password_hash, nickname) VALUES (:email, :hash, :nickname)
                        RETURNING id""")
                .param("email", email)
                .param("hash", passwordHash)
                .param("nickname", nickname)
                .query(Long.class)
                .single();
    }

    public Optional<Account> findByEmail(String email) {
        return jdbc.sql("SELECT id, email, password_hash, nickname FROM users WHERE email = :email")
                .param("email", email)
                .query((rs, i) -> new Account(rs.getLong("id"), rs.getString("email"), rs.getString("password_hash"),
                        rs.getString("nickname")))
                .optional();
    }

    public Optional<Profile> findProfileById(long id) {
        return jdbc.sql("SELECT email, nickname FROM users WHERE id = :id")
                .param("id", id)
                .query((rs, i) -> new Profile(rs.getString("email"), rs.getString("nickname")))
                .optional();
    }

    public Optional<String> findNicknameById(long id) {
        return jdbc.sql("SELECT nickname FROM users WHERE id = :id AND nickname IS NOT NULL")
                .param("id", id)
                .query(String.class)
                .optional();
    }

    // 대소문자 구분 없이 이미 쓰는 닉네임인지. exceptUserId는 본인의 현재 닉네임으로 "변경"하는 경우를 허용하기 위한 값.
    public boolean nicknameTaken(String nickname, Long exceptUserId) {
        return jdbc.sql("""
                        SELECT EXISTS (SELECT 1 FROM users
                                       WHERE lower(nickname) = lower(:nickname) AND (CAST(:except AS BIGINT) IS NULL OR id <> :except))""")
                .param("nickname", nickname)
                .param("except", exceptUserId)
                .query(Boolean.class)
                .single();
    }

    // 닉네임 변경/설정. 동시에 같은 닉네임을 잡으면 DuplicateKeyException.
    public void updateNickname(long id, String nickname) throws DuplicateKeyException {
        jdbc.sql("UPDATE users SET nickname = :nickname WHERE id = :id")
                .param("nickname", nickname)
                .param("id", id)
                .update();
    }
}
