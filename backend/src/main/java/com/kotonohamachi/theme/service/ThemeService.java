package com.kotonohamachi.theme.service;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.theme.Theme;
import com.kotonohamachi.theme.ThemeErrorCode;
import com.kotonohamachi.theme.ThemeProgress;
import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.dto.ThemeProgressResponse;
import com.kotonohamachi.theme.dto.ThemeResponse;
import com.kotonohamachi.theme.repository.ThemeProgressRepository;
import com.kotonohamachi.theme.repository.ThemeRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 테마 학습의 단계 진행 게이트(한자 → 단어 → 표현 → 예문 → 독해)를 처리한다. 각 단계의 실제 콘텐츠(한자/단어 데이터)와
 * 정답 채점은 이 작업의 범위가 아니다 — 이전 단계를 끝내야 다음 단계로 넘어갈 수 있다는 순서 규칙만 담당한다.
 */
@Service
public class ThemeService {

  private final ThemeRepository themeRepository;
  private final ThemeProgressRepository themeProgressRepository;
  private final UserRepository userRepository;

  /**
   * 생성자.
   *
   * @param themeRepository 테마 저장소
   * @param themeProgressRepository 사용자별 테마 진행 상태 저장소
   * @param userRepository 사용자 저장소
   */
  public ThemeService(
      ThemeRepository themeRepository,
      ThemeProgressRepository themeProgressRepository,
      UserRepository userRepository) {
    this.themeRepository = themeRepository;
    this.themeProgressRepository = themeProgressRepository;
    this.userRepository = userRepository;
  }

  /**
   * 모든 테마를 로그인한 사용자의 진행 상태와 함께 조회한다. 아직 시작하지 않은 테마는 첫 단계({@link
   * ThemeStage#KANJI})로 표시된다. 테마 진행 순서는 자유 선택이라 고정된 순서를 강제하지 않는다.
   *
   * @param userId 조회할 사용자 ID(로그인한 본인)
   * @return 테마 목록과 각 테마의 진행 상태
   */
  @Transactional(readOnly = true)
  public List<ThemeResponse> getThemes(Long userId) {
    List<Theme> themes = themeRepository.findAllByOrderById();
    Map<Long, ThemeProgress> progressByThemeId =
        themeProgressRepository.findAllByUserId(userId).stream()
            .collect(
                Collectors.toMap(progress -> progress.getTheme().getId(), Function.identity()));

    return themes.stream()
        .map(theme -> toThemeResponse(theme, progressByThemeId.get(theme.getId())))
        .toList();
  }

  /**
   * 테마의 한 단계를 완료 처리하고 다음 단계로 진행한다. 지금 진행해야 할 단계가 아닌 단계를 요청하면(건너뛰기나 이미 끝난
   * 단계 재요청) 거부한다. 아직 시작하지 않은 테마라면 이 호출로 진행 상태를 새로 만든다.
   *
   * @param userId 진행할 사용자 ID(로그인한 본인)
   * @param themeId 진행할 테마 ID
   * @param stage 완료하려는 단계
   * @return 완료 처리 후의 진행 상태
   */
  @Transactional
  public ThemeProgressResponse completeStage(Long userId, Long themeId, ThemeStage stage) {
    Theme theme = findThemeOrThrow(themeId);
    ThemeProgress progress = themeProgressRepository
        .findByUserIdAndThemeId(userId, themeId)
        .orElseGet(
            () -> themeProgressRepository.save(new ThemeProgress(findUserOrThrow(userId), theme)));

    if (!progress.canComplete(stage)) {
      throw new ApiException(ThemeErrorCode.STAGE_OUT_OF_ORDER);
    }
    progress.completeCurrentStage();

    return new ThemeProgressResponse(themeId, progress.getCurrentStage(), progress.isCompleted());
  }

  private Theme findThemeOrThrow(Long themeId) {
    return themeRepository
        .findById(themeId)
        .orElseThrow(() -> new ApiException(ThemeErrorCode.THEME_NOT_FOUND));
  }

  private User findUserOrThrow(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new IllegalStateException("로그인한 사용자를 찾을 수 없습니다."));
  }

  private ThemeResponse toThemeResponse(Theme theme, ThemeProgress progress) {
    ThemeStage currentStage = progress != null ? progress.getCurrentStage() : ThemeStage.KANJI;
    boolean completed = progress != null && progress.isCompleted();
    return new ThemeResponse(theme.getId(), theme.getTitle(), currentStage, completed);
  }
}
