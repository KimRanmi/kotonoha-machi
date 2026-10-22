package com.kotonohamachi.theme.repository;

import com.kotonohamachi.theme.Theme;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 테마 데이터에 접근한다. */
public interface ThemeRepository extends JpaRepository<Theme, Long> {

  /**
   * 모든 테마를 ID 순서로 조회한다.
   *
   * @return ID 순서로 정렬된 테마 목록
   */
  List<Theme> findAllByOrderById();
}
