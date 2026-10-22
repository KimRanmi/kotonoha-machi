package com.kotonohamachi.theme.repository;

import com.kotonohamachi.theme.ThemeProgress;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 사용자별 테마 진행 상태 데이터에 접근한다. */
public interface ThemeProgressRepository extends JpaRepository<ThemeProgress, Long> {

  /**
   * 사용자가 특정 테마를 어디까지 진행했는지 조회한다.
   *
   * @param userId 조회할 사용자 ID
   * @param themeId 조회할 테마 ID
   * @return 진행 상태(아직 시작하지 않았으면 빈 Optional)
   */
  Optional<ThemeProgress> findByUserIdAndThemeId(Long userId, Long themeId);

  /**
   * 사용자가 진행한 모든 테마의 진행 상태를 조회한다.
   *
   * @param userId 조회할 사용자 ID
   * @return 진행 상태 목록
   */
  List<ThemeProgress> findAllByUserId(Long userId);
}
