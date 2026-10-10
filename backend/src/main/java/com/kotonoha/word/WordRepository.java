package com.kotonoha.word;

import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class WordRepository {

    private final JdbcClient jdbc;

    public WordRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<LearnedWord> all(long userId) {
        return jdbc.sql("SELECT word, added_at FROM learned_words WHERE user_id = :userId ORDER BY added_at, word")
                .param("userId", userId)
                .query((rs, i) -> new LearnedWord(rs.getString("word"), rs.getLong("added_at")))
                .list();
    }

    // 이미 담은 단어면 아무것도 바꾸지 않는다(멱등). 어느 쪽이든 저장된 단어를 돌려준다.
    public LearnedWord add(long userId, String word) {
        jdbc.sql("""
                        INSERT INTO learned_words (user_id, word, added_at) VALUES (:userId, :word, :now)
                        ON CONFLICT (user_id, word) DO NOTHING""")
                .param("userId", userId)
                .param("word", word)
                .param("now", System.currentTimeMillis())
                .update();
        return jdbc.sql("SELECT word, added_at FROM learned_words WHERE user_id = :userId AND word = :word")
                .param("userId", userId)
                .param("word", word)
                .query((rs, i) -> new LearnedWord(rs.getString("word"), rs.getLong("added_at")))
                .single();
    }

    public void remove(long userId, String word) {
        jdbc.sql("DELETE FROM learned_words WHERE user_id = :userId AND word = :word")
                .param("userId", userId)
                .param("word", word)
                .update();
    }
}
