package com.kotonohamachi.theme.repository;

import com.kotonohamachi.theme.ThemeKanji;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 테마 한자(KANJI) 콘텐츠 데이터에 접근한다. */
public interface ThemeKanjiRepository extends JpaRepository<ThemeKanji, Long> {

  /**
   * 테마의 한자 목록을 정해진 순서로 조회한다.
   *
   * @param themeId 테마 ID
   * @return 표시 순서로 정렬된 한자 목록
   */
  List<ThemeKanji> findAllByThemeIdOrderByDisplayOrder(Long themeId);
}
