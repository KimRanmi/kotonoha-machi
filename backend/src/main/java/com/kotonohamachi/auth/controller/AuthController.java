package com.kotonohamachi.auth.controller;

import com.kotonohamachi.auth.dto.AuthUserResponse;
import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.auth.service.AuthService;
import com.kotonohamachi.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.CookieClearingLogoutHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 현재 로그인된 사용자 조회와 회원 탈퇴 API. 로그인은 소셜 로그인({@code /oauth2/**})만 지원하며, 로그아웃({@code POST /api/auth/logout})은 {@link com.kotonohamachi.common.SecurityConfig}에서 Spring Security의 기본 로그아웃 처리로 구성한다. */
@RestController
public class AuthController {

  private final AuthService authService;

  /**
   * 생성자.
   *
   * @param authService 회원 탈퇴 서비스
   */
  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  /**
   * 현재 로그인된 사용자 정보를 반환한다. 로그인하지 않았으면 Spring Security가 401을 반환한다(이 메서드까지 오지
   * 않는다).
   *
   * @param authentication 현재 요청의 인증 정보
   * @return 현재 로그인한 사용자 정보
   */
  @GetMapping("/api/auth/me")
  public AuthUserResponse me(Authentication authentication) {
    User user = AuthPrincipal.resolve(authentication);
    return new AuthUserResponse(user.getId(), user.getEmail(), user.getNickname());
  }

  /**
   * 현재 로그인한 계정을 탈퇴 처리한다. 탈퇴 후에는 현재 세션을 즉시 무효화하고, {@code /api/auth/logout}과 동일하게
   * {@code JSESSIONID} 쿠키도 함께 삭제한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param httpRequest 현재 요청(세션을 무효화하기 위해 필요)
   * @param httpResponse 현재 응답(세션 쿠키를 삭제하기 위해 필요)
   * @return 204 No Content
   */
  @DeleteMapping("/api/auth/me")
  public ResponseEntity<Void> withdraw(
      Authentication authentication,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    User user = AuthPrincipal.resolve(authentication);
    authService.withdraw(user.getId());

    new SecurityContextLogoutHandler().logout(httpRequest, httpResponse, authentication);
    new CookieClearingLogoutHandler("JSESSIONID").logout(httpRequest, httpResponse, authentication);

    return ResponseEntity.noContent().build();
  }
}
