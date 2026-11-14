package com.kotonohamachi.chat.repository;

import com.kotonohamachi.chat.ChatSummary;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 대화 요약 메모에 접근한다. */
public interface ChatSummaryRepository extends JpaRepository<ChatSummary, Long> {

  /**
   * 사용자와 주민의 요약 메모를 조회한다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @return 요약 메모(아직 없으면 빈 값)
   */
  Optional<ChatSummary> findByUserIdAndResidentId(Long userId, Long residentId);
}
