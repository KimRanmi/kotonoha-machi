package com.kotonohamachi.auth.service;

import com.kotonohamachi.user.User;
import org.springframework.security.core.Authentication;

/**
 * 비밀번호 로그인({@link AuthUserDetails})과 소셜 로그인({@link CustomOAuth2User})이 서로 다른 인증 주체 타입을
 * 쓰므로, 로그인 방식과 상관없이 현재 로그인한 {@link User}를 꺼내는 공통 창구.
 */
public final class AuthPrincipal {

  private AuthPrincipal() {}

  /**
   * 현재 인증 정보에서 로그인한 계정을 꺼낸다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @return 로그인한 계정
   */
  public static User resolve(Authentication authentication) {
    Object principal = authentication.getPrincipal();
    if (principal instanceof AuthUserDetails authUserDetails) {
      return authUserDetails.getUser();
    }
    if (principal instanceof CustomOAuth2User customOAuth2User) {
      return customOAuth2User.getUser();
    }
    throw new IllegalStateException("알 수 없는 인증 주체입니다: " + principal.getClass());
  }
}
