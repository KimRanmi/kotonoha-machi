package com.kotonohamachi.chat.repository;

import com.kotonohamachi.chat.ChatMessage;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 대화 기록에 접근한다. */
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

  /**
   * 기간 안([from, to))의 대화를 오래된 순으로 조회한다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @param from 이 시각 이상
   * @param to 이 시각 미만
   * @return 오래된 순으로 정렬된 대화
   */
  List<ChatMessage>
      findByUserIdAndResidentIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByIdAsc(
          Long userId, Long residentId, OffsetDateTime from, OffsetDateTime to);

  /**
   * 주어진 시각 이전에 대화한 날(한국 시간)들을 최신 날짜부터 최대 60일 조회한다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @param before 이 시각 이전의 대화만(보통 오늘 0시)
   * @return 날짜별 줄 수와 처음 한 말
   */
  @Query(value = """
          SELECT to_char(created_at AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD') AS "chatDate",
                 COUNT(*) AS "lineCount",
                 (array_agg(text ORDER BY id) FILTER (WHERE speaker = 'PLAYER'))[1]
                     AS "firstPlayerText"
          FROM chat_message
          WHERE user_id = :userId AND resident_id = :residentId AND created_at < :before
          GROUP BY 1
          ORDER BY 1 DESC
          LIMIT 60
          """, nativeQuery = true)
  List<DayRow> findDaysBefore(
      @Param("userId") Long userId,
      @Param("residentId") Long residentId,
      @Param("before") OffsetDateTime before);

  /** {@link #findDaysBefore}의 한 줄(날짜별 집계). */
  interface DayRow {

    String getChatDate();

    long getLineCount();

    String getFirstPlayerText();
  }

  /**
   * 사용자와 주민의 대화 중 가장 최근 10줄을 최신 순으로 조회한다(AI에게 보낼 최근 맥락).
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @return 최신 순으로 정렬된 대화(첫 원소가 가장 최근 줄)
   */
  List<ChatMessage> findTop10ByUserIdAndResidentIdOrderByIdDesc(Long userId, Long residentId);

  /**
   * 두 id 사이(양 끝 제외)의 대화를 오래된 순으로 조회한다(아직 요약하지 않은 오래된 줄을 찾을 때 쓴다).
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @param afterId 이 id보다 큰 줄만
   * @param beforeId 이 id보다 작은 줄만
   * @return 오래된 순으로 정렬된 대화
   */
  List<ChatMessage> findByUserIdAndResidentIdAndIdGreaterThanAndIdLessThanOrderByIdAsc(
      Long userId, Long residentId, Long afterId, Long beforeId);
}
