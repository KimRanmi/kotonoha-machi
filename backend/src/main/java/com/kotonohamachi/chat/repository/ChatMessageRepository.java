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
}
