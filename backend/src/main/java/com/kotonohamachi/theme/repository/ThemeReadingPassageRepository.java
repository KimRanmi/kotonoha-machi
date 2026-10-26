package com.kotonohamachi.theme.repository;

import com.kotonohamachi.theme.ThemeReadingPassage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 테마 독해(READING) 콘텐츠 데이터에 접근한다. */
public interface ThemeReadingPassageRepository extends JpaRepository<ThemeReadingPassage, Long> {

  /**
   * 테마의 지문 목록을 정해진 순서로 조회한다.
   *
   * @param themeId 테마 ID
   * @return 표시 순서로 정렬된 지문 목록
   */
  List<ThemeReadingPassage> findAllByThemeIdOrderByDisplayOrder(Long themeId);
}
