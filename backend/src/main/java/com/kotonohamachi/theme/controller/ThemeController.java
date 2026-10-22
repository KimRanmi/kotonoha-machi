package com.kotonohamachi.theme.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.dto.ThemeProgressResponse;
import com.kotonohamachi.theme.dto.ThemeResponse;
import com.kotonohamachi.theme.service.ThemeService;
import com.kotonohamachi.user.User;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** 테마 학습 목록 조회와 단계 진행(게이트) API. */
@RestController
public class ThemeController {

  private final ThemeService themeService;

  /**
   * 생성자.
   *
   * @param themeService 테마 진행 서비스
   */
  public ThemeController(ThemeService themeService) {
    this.themeService = themeService;
  }

  /**
   * 모든 테마를 로그인한 사용자 자신의 진행 상태와 함께 조회한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @return 테마 목록과 각 테마의 진행 상태
   */
  @GetMapping("/api/themes")
  public List<ThemeResponse> getThemes(Authentication authentication) {
    User user = AuthPrincipal.resolve(authentication);
    return themeService.getThemes(user.getId());
  }

  /**
   * 로그인한 사용자 자신이 테마의 한 단계를 완료 처리한다. 지금 진행해야 할 단계가 아니면 거부한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param themeId 진행할 테마 ID
   * @param stage 완료하려는 단계
   * @return 완료 처리 후의 진행 상태
   */
  @PostMapping("/api/themes/{themeId}/stages/{stage}/complete")
  public ThemeProgressResponse completeStage(
      Authentication authentication, @PathVariable Long themeId, @PathVariable ThemeStage stage) {
    User user = AuthPrincipal.resolve(authentication);
    return themeService.completeStage(user.getId(), themeId, stage);
  }
}
