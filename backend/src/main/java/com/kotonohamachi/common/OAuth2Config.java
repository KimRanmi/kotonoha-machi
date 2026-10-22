package com.kotonohamachi.common;

import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;

/**
 * {@link DefaultOAuth2UserService}, {@link ClientRegistrationRepository}를 빈으로 등록한다. {@code
 * SecurityConfig}가 {@code CustomOAuth2UserService}에 의존하고, {@code CustomOAuth2UserService}가 이
 * 클래스의 빈에 의존하는 구조라, 이 빈들을 {@code SecurityConfig} 안에 두면 순환 의존이 생긴다. 그래서 별도 설정 클래스로
 * 분리했다.
 */
@Configuration
public class OAuth2Config {

  private static final String REDIRECT_URI_TEMPLATE =
      "{baseUrl}/login/oauth2/code/{registrationId}";

  /**
   * 소셜 제공자의 사용자 정보 엔드포인트를 실제로 호출하는 기본 구현체를 등록한다.
   *
   * @return 기본 OAuth2 사용자 정보 서비스
   */
  @Bean
  public DefaultOAuth2UserService defaultOAuth2UserService() {
    return new DefaultOAuth2UserService();
  }

  /**
   * 소셜 로그인 제공자 등록 정보를 담은 저장소를 만든다. Client ID가 비어 있는 제공자(아직 발급받지 않은 제공자)는
   * 등록 목록에서 그냥 빼버린다. {@code application.yml}에 {@code spring.security.oauth2.client.registration}
   * 형태로 선언하면, Spring Boot가 비어 있는 Client ID를 가진 제공자가 하나라도 있으면 애플리케이션 전체가 부팅에
   * 실패한다({@code OAuth2ClientProperties}가 모든 등록 정보를 필수로 검증하기 때문) — 그래서 직접 코드로 등록한다.
   *
   * @param googleClientId 구글 Client ID (없으면 빈 문자열)
   * @param googleClientSecret 구글 Client Secret
   * @param kakaoClientId 카카오 Client ID (없으면 빈 문자열)
   * @param kakaoClientSecret 카카오 Client Secret
   * @param naverClientId 네이버 Client ID (없으면 빈 문자열)
   * @param naverClientSecret 네이버 Client Secret
   * @return 등록된(Client ID가 있는) 제공자만 담은 저장소
   */
  @Bean
  public ClientRegistrationRepository clientRegistrationRepository(
      @Value("${GOOGLE_CLIENT_ID:}") String googleClientId,
      @Value("${GOOGLE_CLIENT_SECRET:}") String googleClientSecret,
      @Value("${KAKAO_CLIENT_ID:}") String kakaoClientId,
      @Value("${KAKAO_CLIENT_SECRET:}") String kakaoClientSecret,
      @Value("${NAVER_CLIENT_ID:}") String naverClientId,
      @Value("${NAVER_CLIENT_SECRET:}") String naverClientSecret) {
    Map<String, ClientRegistration> registrations = new HashMap<>();

    if (!googleClientId.isBlank()) {
      registrations.put("google", googleRegistration(googleClientId, googleClientSecret));
    }
    if (!kakaoClientId.isBlank()) {
      registrations.put("kakao", kakaoRegistration(kakaoClientId, kakaoClientSecret));
    }
    if (!naverClientId.isBlank()) {
      registrations.put("naver", naverRegistration(naverClientId, naverClientSecret));
    }

    // ClientRegistrationRepository는 메서드 하나짜리 함수형 인터페이스라, Map::get으로 바로 구현한다.
    // registrations가 비어 있어도(소셜 로그인을 하나도 설정 안 한 상태) 문제없이 동작한다.
    return registrations::get;
  }

  private ClientRegistration googleRegistration(String clientId, String clientSecret) {
    return CommonOAuth2Provider.GOOGLE
        .getBuilder("google")
        .clientId(clientId)
        .clientSecret(clientSecret)
        .scope("email", "profile")
        .build();
  }

  private ClientRegistration kakaoRegistration(String clientId, String clientSecret) {
    return ClientRegistration.withRegistrationId("kakao")
        .clientId(clientId)
        .clientSecret(clientSecret)
        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .redirectUri(REDIRECT_URI_TEMPLATE)
        .scope("profile_nickname", "account_email")
        .authorizationUri("https://kauth.kakao.com/oauth/authorize")
        .tokenUri("https://kauth.kakao.com/oauth/token")
        .userInfoUri("https://kapi.kakao.com/v2/user/me")
        .userNameAttributeName("id")
        .clientName("Kakao")
        .build();
  }

  private ClientRegistration naverRegistration(String clientId, String clientSecret) {
    return ClientRegistration.withRegistrationId("naver")
        .clientId(clientId)
        .clientSecret(clientSecret)
        .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .redirectUri(REDIRECT_URI_TEMPLATE)
        .scope("name", "email")
        .authorizationUri("https://nid.naver.com/oauth2.0/authorize")
        .tokenUri("https://nid.naver.com/oauth2.0/token")
        .userInfoUri("https://openapi.naver.com/v1/nid/me")
        .userNameAttributeName("response")
        .clientName("Naver")
        .build();
  }
}
