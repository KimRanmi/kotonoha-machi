package com.kotonoha.user;

import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

    public record Account(long id, String email, String passwordHash) {}

    private final JdbcClient jdbc;

    public UserRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // 이메일이 이미 있으면 DuplicateKeyException (email UNIQUE).
    public long create(String email, String passwordHash) throws DuplicateKeyException {
        return jdbc.sql("INSERT INTO users (email, password_hash) VALUES (:email, :hash) RETURNING id")
                .param("email", email)
                .param("hash", passwordHash)
                .query(Long.class)
                .single();
    }

    public Optional<Account> findByEmail(String email) {
        return jdbc.sql("SELECT id, email, password_hash FROM users WHERE email = :email")
                .param("email", email)
                .query((rs, i) -> new Account(rs.getLong("id"), rs.getString("email"), rs.getString("password_hash")))
                .optional();
    }

    public Optional<String> findEmailById(long id) {
        return jdbc.sql("SELECT email FROM users WHERE id = :id")
                .param("id", id)
                .query(String.class)
                .optional();
    }
}
