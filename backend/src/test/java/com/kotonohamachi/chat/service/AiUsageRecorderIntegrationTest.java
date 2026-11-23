package com.kotonohamachi.chat.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.kotonohamachi.chat.AiCallType;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** {@link AiUsageRecorder}가 실제 Postgres에 기록하고, 기록이 실패해도 호출한 쪽을 깨뜨리지 않는지 검증한다. */
@Testcontainers
@SpringBootTest
class AiUsageRecorderIntegrationTest {

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @Autowired
  private AiUsageRecorder recorder;

  @Autowired
  private JdbcTemplate jdbcTemplate;

  @Autowired
  private TransactionTemplate transactionTemplate;

  @Test
  void record_호출_정보를_한_줄로_저장한다() {
    // user_id는 NULL 허용(탈퇴한 사용자)이라 사용자 없이도 저장된다.
    recorder.record(null, AiCallType.CHAT, "gemini-3.5-flash-lite", 120, 30, true, null);
    recorder.record(null, AiCallType.TRANSLATE, "gemini-3.5-flash-lite", null, null, false, 429);

    List<Map<String, Object>> rows = jdbcTemplate.queryForList(
        "SELECT call_type, model, input_tokens, output_tokens, success, error_status, created_at"
            + " FROM ai_usage WHERE call_type IN ('CHAT', 'TRANSLATE') ORDER BY id");
    assertThat(rows).hasSize(2);
    assertThat(rows.get(0))
        .containsEntry("call_type", "CHAT")
        .containsEntry("model", "gemini-3.5-flash-lite")
        .containsEntry("input_tokens", 120)
        .containsEntry("output_tokens", 30)
        .containsEntry("success", true);
    assertThat(rows.get(0).get("created_at")).isNotNull();
    assertThat(rows.get(1)).containsEntry("success", false).containsEntry("error_status", 429);
  }

  @Test
  void record_저장이_실패해도_예외를_던지지_않고_호출한_쪽_트랜잭션도_살아_있다() {
    // 없는 user_id는 외래 키 위반으로 저장이 실패한다.
    Integer result = transactionTemplate.execute(status -> {
      assertThatCode(() -> recorder.record(999_999_999L, AiCallType.SUMMARY, "m", 1, 1, true, null))
          .doesNotThrowAnyException();
      return jdbcTemplate.queryForObject("SELECT 1", Integer.class);
    });

    assertThat(result).isEqualTo(1);
    assertThat(jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM ai_usage WHERE user_id = 999999999", Integer.class))
        .isZero();
  }
}
