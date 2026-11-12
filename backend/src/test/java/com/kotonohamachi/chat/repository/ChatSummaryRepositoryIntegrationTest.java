package com.kotonohamachi.chat.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kotonohamachi.chat.ChatSummary;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** V33 마이그레이션이 적용되고 {@link ChatSummaryRepository}가 동작하는지 실제 Postgres로 확인한다. */
@Testcontainers
@SpringBootTest
class ChatSummaryRepositoryIntegrationTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @Autowired
  private ChatSummaryRepository summaryRepository;

  @Autowired
  private JdbcTemplate jdbc;

  private long newUser() {
    String key = UUID.randomUUID().toString().substring(0, 8);
    return jdbc.queryForObject(
        "INSERT INTO users (email, password_hash, nickname, status) VALUES (?, 'x', ?, 'ACTIVE') RETURNING id",
        Long.class,
        key + "@test.com",
        "n-" + key);
  }

  private long anyResidentId() {
    return jdbc.queryForObject("SELECT id FROM resident ORDER BY id LIMIT 1", Long.class);
  }

  @Test
  void 요약을_저장하고_조회하고_갱신한다() {
    long userId = newUser();
    long residentId = anyResidentId();

    summaryRepository.save(ChatSummary.create(userId, residentId, "첫 요약", 10L));
    ChatSummary found =
        summaryRepository.findByUserIdAndResidentId(userId, residentId).orElseThrow();
    assertThat(found.getSummary()).isEqualTo("첫 요약");
    assertThat(found.getSummarizedUpToId()).isEqualTo(10L);

    found.update("새 요약", 30L);
    summaryRepository.save(found);
    ChatSummary updated =
        summaryRepository.findByUserIdAndResidentId(userId, residentId).orElseThrow();
    assertThat(updated.getSummary()).isEqualTo("새 요약");
    assertThat(updated.getSummarizedUpToId()).isEqualTo(30L);
  }

  @Test
  void 같은_사용자_주민_쌍은_한_줄만_허용한다() {
    long userId = newUser();
    long residentId = anyResidentId();
    summaryRepository.saveAndFlush(ChatSummary.create(userId, residentId, "a", 1L));

    assertThatThrownBy(
            () -> summaryRepository.saveAndFlush(ChatSummary.create(userId, residentId, "b", 2L)))
        .isInstanceOf(Exception.class);
  }
}
