package com.kotonohamachi.chat.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.kotonohamachi.chat.ChatMessage;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 날짜별 대화 조회 쿼리(범위 조회, 날짜 집계)를 실제 Postgres로 검증한다. */
@Testcontainers
@SpringBootTest
class ChatMessageRepositoryIntegrationTest {

  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  @Container
  @ServiceConnection
  static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

  @Autowired
  private ChatMessageRepository repository;

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

  private long residentId(int offset) {
    return jdbc.queryForObject(
        "SELECT id FROM resident ORDER BY id OFFSET ? LIMIT 1", Long.class, offset);
  }

  private OffsetDateTime kst(String isoLocal) {
    return java.time.LocalDateTime.parse(isoLocal).atZone(KST).toOffsetDateTime();
  }

  private void insert(
      long userId, long residentId, String speaker, String text, OffsetDateTime at) {
    jdbc.update(
        "INSERT INTO chat_message (user_id, resident_id, speaker, text, created_at)"
            + " VALUES (?, ?, ?, ?, ?)",
        userId,
        residentId,
        speaker,
        text,
        at);
  }

  @Test
  void 날짜_범위_조회는_시작_포함_끝_제외이고_오래된_순이며_사용자별로_격리된다() {
    long alice = newUser();
    long bob = newUser();
    long resident = residentId(0);
    insert(alice, resident, "PLAYER", "전날 마지막", kst("2026-03-09T23:59:59"));
    insert(alice, resident, "PLAYER", "0시 정각", kst("2026-03-10T00:00:00"));
    insert(alice, resident, "RESIDENT", "낮", kst("2026-03-10T12:00:00"));
    insert(alice, resident, "PLAYER", "다음날 0시", kst("2026-03-11T00:00:00"));
    insert(bob, resident, "PLAYER", "밥의 말", kst("2026-03-10T12:00:00"));

    List<ChatMessage> result =
        repository
            .findByUserIdAndResidentIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByIdAsc(
                alice, resident, kst("2026-03-10T00:00:00"), kst("2026-03-11T00:00:00"));

    assertThat(result).extracting(ChatMessage::getText).containsExactly("0시 정각", "낮");
  }

  @Test
  void findDaysBefore는_KST_날짜별로_묶고_최신_날짜부터_첫_플레이어_말을_돌려준다() {
    long alice = newUser();
    long bob = newUser();
    long resident = residentId(0);
    long otherResident = residentId(1);
    // 3/9 UTC 16:00 = KST 3/10 01:00 이므로 KST 기준 3/10으로 묶여야 한다.
    insert(alice, resident, "RESIDENT", "먼저 말 건 주민", kst("2026-03-10T00:30:00"));
    insert(alice, resident, "PLAYER", "첫 말", kst("2026-03-10T01:00:00"));
    insert(alice, resident, "PLAYER", "둘째 말", kst("2026-03-10T02:00:00"));
    insert(alice, resident, "RESIDENT", "주민만", kst("2026-03-08T10:00:00"));
    insert(alice, resident, "PLAYER", "오래전", kst("2026-03-05T23:59:58"));
    insert(alice, resident, "RESIDENT", "답", kst("2026-03-05T23:59:59"));
    insert(alice, resident, "PLAYER", "오늘", kst("2026-03-12T09:00:00"));
    insert(bob, resident, "PLAYER", "밥", kst("2026-03-10T10:00:00"));
    insert(alice, otherResident, "PLAYER", "다른 주민", kst("2026-03-10T10:00:00"));

    List<ChatMessageRepository.DayRow> days =
        repository.findDaysBefore(alice, resident, kst("2026-03-12T00:00:00"));

    assertThat(days)
        .extracting(ChatMessageRepository.DayRow::getChatDate)
        .containsExactly("2026-03-10", "2026-03-08", "2026-03-05");
    assertThat(days)
        .extracting(ChatMessageRepository.DayRow::getLineCount)
        .containsExactly(3L, 1L, 2L);
    assertThat(days)
        .extracting(ChatMessageRepository.DayRow::getFirstPlayerText)
        .containsExactly("첫 말", null, "오래전");
  }

  @Test
  void findDaysBefore는_최대_60일까지만_돌려준다() {
    long user = newUser();
    long resident = residentId(0);
    OffsetDateTime base = kst("2026-01-01T12:00:00");
    for (int i = 0; i < 65; i++) {
      insert(user, resident, "PLAYER", "d" + i, base.plusDays(i));
    }

    List<ChatMessageRepository.DayRow> days =
        repository.findDaysBefore(user, resident, kst("2026-06-01T00:00:00"));

    assertThat(days).hasSize(60);
    assertThat(days.get(0).getFirstPlayerText()).isEqualTo("d64");
  }

  @Test
  void findDaysBefore는_대화가_없으면_빈_목록이다() {
    assertThat(repository.findDaysBefore(newUser(), residentId(0), OffsetDateTime.now()))
        .isEmpty();
  }

  @Test
  void findTop30은_afterId_이후만_최신_순으로_돌려주고_afterId_자신은_제외한다() {
    long user = newUser();
    long resident = residentId(0);
    OffsetDateTime at = kst("2026-03-10T12:00:00");
    for (int i = 1; i <= 5; i++) {
      insert(user, resident, "PLAYER", "t" + i, at.plusMinutes(i));
    }
    List<ChatMessage> all =
        repository.findTop30ByUserIdAndResidentIdAndIdGreaterThanOrderByIdDesc(user, resident, 0L);
    assertThat(all).extracting(ChatMessage::getText).containsExactly("t5", "t4", "t3", "t2", "t1");
    long thirdId = all.get(2).getId();

    List<ChatMessage> after =
        repository.findTop30ByUserIdAndResidentIdAndIdGreaterThanOrderByIdDesc(
            user, resident, thirdId);

    assertThat(after).extracting(ChatMessage::getText).containsExactly("t5", "t4");
  }

  @Test
  void findTop30은_최신_30줄까지만_돌려준다() {
    long user = newUser();
    long resident = residentId(0);
    OffsetDateTime at = kst("2026-03-10T12:00:00");
    for (int i = 1; i <= 35; i++) {
      insert(user, resident, "PLAYER", "t" + i, at.plusMinutes(i));
    }

    List<ChatMessage> result =
        repository.findTop30ByUserIdAndResidentIdAndIdGreaterThanOrderByIdDesc(user, resident, 0L);

    assertThat(result).hasSize(30);
    assertThat(result.get(0).getText()).isEqualTo("t35");
    assertThat(result.get(29).getText()).isEqualTo("t6");
  }

  @Test
  void findTop30은_다른_사용자와_다른_주민의_대화를_섞지_않는다() {
    long alice = newUser();
    long bob = newUser();
    long resident = residentId(0);
    long other = residentId(1);
    OffsetDateTime at = kst("2026-03-10T12:00:00");
    insert(alice, resident, "PLAYER", "앨리스", at);
    insert(bob, resident, "PLAYER", "밥", at.plusMinutes(1));
    insert(alice, other, "PLAYER", "다른 주민", at.plusMinutes(2));

    List<ChatMessage> result =
        repository.findTop30ByUserIdAndResidentIdAndIdGreaterThanOrderByIdDesc(alice, resident, 0L);

    assertThat(result).extracting(ChatMessage::getText).containsExactly("앨리스");
  }
}
