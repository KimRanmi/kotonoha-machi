package com.kotonohamachi.auth.service;

import com.kotonohamachi.user.SocialAccount;
import com.kotonohamachi.user.SocialProvider;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.UserStatus;
import com.kotonohamachi.user.repository.SocialAccountRepository;
import com.kotonohamachi.user.repository.UserRepository;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 구글/카카오/네이버 소셜 로그인으로 받은 사용자 정보를 처리한다. 이미 연결된 소셜 계정이면 그 계정으로 로그인하고,
 * 처음 보는 소셜 계정이면 같은 이메일의 기존 계정에 연결하거나(자동 연결) 새 계정을 만든다.
 */
@Service
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

  private final OAuth2UserService<OAuth2UserRequest, OAuth2User> delegate;
  private final UserRepository userRepository;
  private final SocialAccountRepository socialAccountRepository;

  /**
   * 생성자.
   *
   * @param delegate 소셜 제공자의 사용자 정보 엔드포인트를 실제로 호출하는 기본 구현체
   * @param userRepository 사용자 저장소
   * @param socialAccountRepository 소셜 로그인 연결 저장소
   */
  public CustomOAuth2UserService(
      DefaultOAuth2UserService delegate,
      UserRepository userRepository,
      SocialAccountRepository socialAccountRepository) {
    this.delegate = delegate;
    this.userRepository = userRepository;
    this.socialAccountRepository = socialAccountRepository;
  }

  @Override
  @Transactional
  public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
    OAuth2User oAuth2User = delegate.loadUser(userRequest);
    SocialProvider provider =
        parseProvider(userRequest.getClientRegistration().getRegistrationId());
    SocialUserInfo info = extractUserInfo(provider, oAuth2User.getAttributes());

    if (info.email() == null || info.email().isBlank()) {
      throw new OAuth2AuthenticationException(
          new OAuth2Error("missing_email"), "이메일 제공에 동의해야 로그인할 수 있습니다.");
    }

    User user = resolveUser(provider, info);
    if (user.getStatus() == UserStatus.WITHDRAWN) {
      throw new OAuth2AuthenticationException(new OAuth2Error("withdrawn_account"), "탈퇴한 계정입니다.");
    }
    return new CustomOAuth2User(user, oAuth2User.getAttributes());
  }

  private User resolveUser(SocialProvider provider, SocialUserInfo info) {
    return socialAccountRepository
        .findByProviderAndProviderUserId(provider, info.providerUserId())
        .map(SocialAccount::getUser)
        .orElseGet(() -> linkOrCreateUser(provider, info));
  }

  private User linkOrCreateUser(SocialProvider provider, SocialUserInfo info) {
    Optional<User> existingUser = userRepository.findByEmail(info.email());
    if (existingUser.isPresent() && existingUser.get().getStatus() == UserStatus.WITHDRAWN) {
      // 탈퇴한 계정과 같은 이메일로 처음 연결을 시도하는 경우다. 소셜 계정을 저장해봐야 곧바로 거부될 것이므로,
      // 불필요한 쓰기를 피하기 위해 저장 전에 바로 거부한다.
      throw new OAuth2AuthenticationException(new OAuth2Error("withdrawn_account"), "탈퇴한 계정입니다.");
    }

    User user = existingUser.orElseGet(() -> userRepository.save(
        User.createFromSocialLogin(info.email(), resolveAvailableNickname(info.name()))));
    socialAccountRepository.save(new SocialAccount(user, provider, info.providerUserId()));
    return user;
  }

  private String resolveAvailableNickname(String preferred) {
    String base = (preferred == null || preferred.isBlank()) ? "주민" : preferred;
    String candidate = base;
    while (userRepository.existsByNickname(candidate)) {
      candidate = base + ThreadLocalRandom.current().nextInt(1000, 10000);
    }
    return candidate;
  }

  private SocialProvider parseProvider(String registrationId) {
    try {
      return SocialProvider.valueOf(registrationId.toUpperCase());
    } catch (IllegalArgumentException e) {
      throw new OAuth2AuthenticationException(
          new OAuth2Error("unsupported_provider"), "지원하지 않는 소셜 로그인입니다: " + registrationId);
    }
  }

  @SuppressWarnings("unchecked")
  private SocialUserInfo extractUserInfo(SocialProvider provider, Map<String, Object> attributes) {
    return switch (provider) {
      case GOOGLE ->
        new SocialUserInfo(
            String.valueOf(attributes.get("sub")), (String) attributes.get("email"), (String)
                attributes.get("name"));
      case KAKAO -> {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        Map<String, Object> properties = (Map<String, Object>) attributes.get("properties");
        yield new SocialUserInfo(
            String.valueOf(attributes.get("id")),
            kakaoAccount == null ? null : (String) kakaoAccount.get("email"),
            properties == null ? null : (String) properties.get("nickname"));
      }
      case NAVER -> {
        Map<String, Object> response = (Map<String, Object>) attributes.get("response");
        yield new SocialUserInfo(
            (String) response.get("id"), (String) response.get("email"), (String)
                response.get("name"));
      }
    };
  }

  private record SocialUserInfo(String providerUserId, String email, String name) {}
}
