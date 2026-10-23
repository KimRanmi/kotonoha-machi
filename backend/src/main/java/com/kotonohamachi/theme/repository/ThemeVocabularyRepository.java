package com.kotonohamachi.theme.repository;

import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.ThemeVocabulary;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 테마 단어(WORD)·표현(EXPRESSION) 콘텐츠 데이터에 접근한다. */
public interface ThemeVocabularyRepository extends JpaRepository<ThemeVocabulary, Long> {

  /**
   * 테마의 특정 단계(단어 또는 표현) 목록을 정해진 순서로 조회한다.
   *
   * @param themeId 테마 ID
   * @param stage {@link ThemeStage#WORD} 또는 {@link ThemeStage#EXPRESSION}
   * @return 표시 순서로 정렬된 단어·표현 목록
   */
  List<ThemeVocabulary> findAllByThemeIdAndStageOrderByDisplayOrder(Long themeId, ThemeStage stage);
}
