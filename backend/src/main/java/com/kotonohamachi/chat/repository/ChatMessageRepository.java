package com.kotonohamachi.chat.repository;

import com.kotonohamachi.chat.ChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 대화 기록에 접근한다. */
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

  /**
   * 사용자와 주민의 대화 중 가장 최근 50줄을 최신 순으로 조회한다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @return 최신 순으로 정렬된 대화(첫 원소가 가장 최근 줄)
   */
  List<ChatMessage> findTop50ByUserIdAndResidentIdOrderByIdDesc(Long userId, Long residentId);

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
