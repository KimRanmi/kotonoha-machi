package com.kotonohamachi.theme.repository;

import com.kotonohamachi.theme.ThemeReadingQuestion;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 독해 이해 문제 데이터에 접근한다. */
public interface ThemeReadingQuestionRepository extends JpaRepository<ThemeReadingQuestion, Long> {

  /**
   * 지문의 이해 문제를 정해진 순서로 조회한다.
   *
   * @param passageId 지문 ID
   * @return 표시 순서로 정렬된 문제 목록
   */
  List<ThemeReadingQuestion> findAllByPassageIdOrderByDisplayOrder(Long passageId);
}
