package com.kotonohamachi;

import com.kotonohamachi.auth.service.CustomOAuth2User;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import java.util.Map;
import java.util.UUID;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

/**
 * 통합 테스트에서 "로그인한 상태"의 세션을 만든다. 로그인은 소셜 로그인만 지원하는데 소셜 제공자를 실제로 부를 수는 없어서, 소셜
 * 로그인이 성공했을 때 세션에 남는 것과 같은 인증 정보를 세션에 직접 넣는다.
 */
public final class TestSessions {

  private TestSessions() {}

  /**
   * 새 소셜 가입 계정을 저장하고, 그 계정으로 로그인한 세션을 돌려준다.
   *
   * @param userRepository 계정을 저장할 저장소
   * @return 로그인한 상태의 세션
   */
  public static MockHttpSession loggedInSession(UserRepository userRepository) {
    return sessionFor(newUser(userRepository));
  }

  /**
   * 새 소셜 가입 계정을 저장해 돌려준다. 이메일과 닉네임은 호출마다 겹치지 않는다.
   *
   * @param userRepository 계정을 저장할 저장소
   * @return 저장된 계정
   */
  public static User newUser(UserRepository userRepository) {
    return userRepository.save(User.createFromSocialLogin(
        "user-" + UUID.randomUUID() + "@test.com",
        "nick-" + UUID.randomUUID().toString().substring(0, 8)));
  }

  /**
   * 이미 저장된 계정으로 로그인한 세션을 돌려준다.
   *
   * @param user 로그인할 계정
   * @return 로그인한 상태의 세션
   */
  public static MockHttpSession sessionFor(User user) {
    CustomOAuth2User principal = new CustomOAuth2User(user, Map.of("sub", "test"));
    OAuth2AuthenticationToken authentication =
        new OAuth2AuthenticationToken(principal, principal.getAuthorities(), "google");
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);

    MockHttpSession session = new MockHttpSession();
    session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);
    return session;
  }
}
