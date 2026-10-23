package com.kotonohamachi.theme.repository;

import com.kotonohamachi.theme.ThemeExample;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 테마 예문(EXAMPLE) 콘텐츠 데이터에 접근한다. */
public interface ThemeExampleRepository extends JpaRepository<ThemeExample, Long> {

  /**
   * 테마의 예문 목록을 정해진 순서로 조회한다.
   *
   * @param themeId 테마 ID
   * @return 표시 순서로 정렬된 예문 목록
   */
  List<ThemeExample> findAllByThemeIdOrderByDisplayOrder(Long themeId);
}
