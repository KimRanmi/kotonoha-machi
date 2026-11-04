package com.kotonohamachi.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kotonohamachi.user.SocialAccount;
import com.kotonohamachi.user.SocialProvider;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.SocialAccountRepository;
import com.kotonohamachi.user.repository.UserRepository;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

/** {@link CustomOAuth2UserService}의 계정 연결 규칙(기존 연결 재사용, 같은 이메일 자동 연결, 신규 가입)을 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class CustomOAuth2UserServiceTest {

  @Mock
  private DefaultOAuth2UserService delegate;

  @Mock
  private UserRepository userRepository;

  @Mock
  private SocialAccountRepository socialAccountRepository;

  private CustomOAuth2UserService authService;

  @BeforeEach
  void setUp() {
    authService = new CustomOAuth2UserService(delegate, userRepository, socialAccountRepository);
  }

  private static OAuth2UserRequest userRequest(String registrationId) {
    ClientRegistration registration = ClientRegistration.withRegistrationId(registrationId)
        .clientId("client-id")
        .clientSecret("client-secret")
        .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
        .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
        .authorizationUri("https://example.com/authorize")
        .tokenUri("https://example.com/token")
        .build();
    OAuth2AccessToken accessToken = new OAuth2AccessToken(
        OAuth2AccessToken.TokenType.BEARER,
        "token-value",
        Instant.now(),
        Instant.now().plusSeconds(3600));
    return new OAuth2UserRequest(registration, accessToken);
  }

  @Test
  void 구글_신규_이메일이면_계정을_새로_만들고_소셜_연결을_저장한다() {
    OAuth2User googleUser = new DefaultOAuth2User(
        List.of(), Map.of("sub", "google-123", "email", "a@test.com", "name", "테스트"), "sub");
    when(delegate.loadUser(any())).thenReturn(googleUser);
    when(socialAccountRepository.findByProviderAndProviderUserId(
            SocialProvider.GOOGLE, "google-123"))
        .thenReturn(Optional.empty());
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.empty());
    when(userRepository.existsByNickname("테스트")).thenReturn(false);
    when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    OAuth2User result = authService.loadUser(userRequest("google"));

    User createdUser = ((CustomOAuth2User) result).getUser();
    assertThat(createdUser.getEmail()).isEqualTo("a@test.com");
    assertThat(createdUser.getNickname()).isEqualTo("테스트");
    verify(socialAccountRepository).save(any(SocialAccount.class));
  }

  @Test
  void 이미_연결된_소셜_계정이면_기존_계정을_그대로_쓰고_새로_만들지_않는다() {
    User existingUser =
        new User("a@test.com", "hash", "nick", "000000", OffsetDateTime.now().plusMinutes(10));
    SocialAccount existingLink =
        new SocialAccount(existingUser, SocialProvider.GOOGLE, "google-123");
    OAuth2User googleUser = new DefaultOAuth2User(
        List.of(), Map.of("sub", "google-123", "email", "a@test.com", "name", "테스트"), "sub");
    when(delegate.loadUser(any())).thenReturn(googleUser);
    when(socialAccountRepository.findByProviderAndProviderUserId(
            SocialProvider.GOOGLE, "google-123"))
        .thenReturn(Optional.of(existingLink));

    OAuth2User result = authService.loadUser(userRequest("google"));

    assertThat(((CustomOAuth2User) result).getUser()).isSameAs(existingUser);
    verify(userRepository, never()).save(any());
    verify(socialAccountRepository, never()).save(any());
  }

  @Test
  void 같은_이메일의_기존_계정이_있으면_새로_만들지_않고_자동으로_연결한다() {
    User existingUser =
        new User("a@test.com", "hash", "nick", "000000", OffsetDateTime.now().plusMinutes(10));
    OAuth2User googleUser = new DefaultOAuth2User(
        List.of(), Map.of("sub", "google-123", "email", "a@test.com", "name", "테스트"), "sub");
    when(delegate.loadUser(any())).thenReturn(googleUser);
    when(socialAccountRepository.findByProviderAndProviderUserId(
            SocialProvider.GOOGLE, "google-123"))
        .thenReturn(Optional.empty());
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(existingUser));

    OAuth2User result = authService.loadUser(userRequest("google"));

    assertThat(((CustomOAuth2User) result).getUser()).isSameAs(existingUser);
    verify(userRepository, never()).save(any());
    verify(socialAccountRepository).save(any(SocialAccount.class));
  }

  @Test
  void 카카오_중첩된_속성에서_이메일과_닉네임을_뽑아낸다() {
    Map<String, Object> kakaoAccount = Map.of("email", "kakao@test.com");
    Map<String, Object> properties = Map.of("nickname", "카카오유저");
    OAuth2User kakaoUser = new DefaultOAuth2User(
        List.of(),
        Map.of("id", 999L, "kakao_account", kakaoAccount, "properties", properties),
        "id");
    when(delegate.loadUser(any())).thenReturn(kakaoUser);
    when(socialAccountRepository.findByProviderAndProviderUserId(SocialProvider.KAKAO, "999"))
        .thenReturn(Optional.empty());
    when(userRepository.findByEmail("kakao@test.com")).thenReturn(Optional.empty());
    when(userRepository.existsByNickname("카카오유저")).thenReturn(false);
    when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    OAuth2User result = authService.loadUser(userRequest("kakao"));

    User createdUser = ((CustomOAuth2User) result).getUser();
    assertThat(createdUser.getEmail()).isEqualTo("kakao@test.com");
    assertThat(createdUser.getNickname()).isEqualTo("카카오유저");
  }

  @Test
  void 네이버_response로_감싸진_속성에서_이메일과_이름을_뽑아낸다() {
    Map<String, Object> response =
        Map.of("id", "naver-1", "email", "naver@test.com", "name", "네이버유저");
    OAuth2User naverUser =
        new DefaultOAuth2User(List.of(), Map.of("response", response), "response");
    when(delegate.loadUser(any())).thenReturn(naverUser);
    when(socialAccountRepository.findByProviderAndProviderUserId(SocialProvider.NAVER, "naver-1"))
        .thenReturn(Optional.empty());
    when(userRepository.findByEmail("naver@test.com")).thenReturn(Optional.empty());
    when(userRepository.existsByNickname("네이버유저")).thenReturn(false);
    when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    OAuth2User result = authService.loadUser(userRequest("naver"));

    User createdUser = ((CustomOAuth2User) result).getUser();
    assertThat(createdUser.getEmail()).isEqualTo("naver@test.com");
    assertThat(createdUser.getNickname()).isEqualTo("네이버유저");
  }

  @Test
  void 이메일이_없으면_예외를_던진다() {
    OAuth2User googleUser =
        new DefaultOAuth2User(List.of(), Map.of("sub", "google-123", "name", "테스트"), "sub");
    when(delegate.loadUser(any())).thenReturn(googleUser);

    assertThatThrownBy(() -> authService.loadUser(userRequest("google")))
        .isInstanceOf(OAuth2AuthenticationException.class);
  }

  @Test
  void 닉네임이_이미_있으면_다른_닉네임을_만들어낸다() {
    OAuth2User googleUser = new DefaultOAuth2User(
        List.of(), Map.of("sub", "google-123", "email", "a@test.com", "name", "테스트"), "sub");
    when(delegate.loadUser(any())).thenReturn(googleUser);
    when(socialAccountRepository.findByProviderAndProviderUserId(
            SocialProvider.GOOGLE, "google-123"))
        .thenReturn(Optional.empty());
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.empty());
    when(userRepository.existsByNickname(startsWith("테스트"))).thenReturn(true, false);
    when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    OAuth2User result = authService.loadUser(userRequest("google"));

    User createdUser = ((CustomOAuth2User) result).getUser();
    assertThat(createdUser.getNickname()).startsWith("테스트").isNotEqualTo("테스트");
  }

  @Test
  void 탈퇴한_계정으로_연결된_소셜_로그인을_시도하면_예외를_던진다() {
    User withdrawnUser =
        new User("a@test.com", "hash", "nick", "000000", OffsetDateTime.now().plusMinutes(10));
    withdrawnUser.withdraw();
    SocialAccount existingLink =
        new SocialAccount(withdrawnUser, SocialProvider.GOOGLE, "google-123");
    OAuth2User googleUser = new DefaultOAuth2User(
        List.of(), Map.of("sub", "google-123", "email", "a@test.com", "name", "테스트"), "sub");
    when(delegate.loadUser(any())).thenReturn(googleUser);
    when(socialAccountRepository.findByProviderAndProviderUserId(
            SocialProvider.GOOGLE, "google-123"))
        .thenReturn(Optional.of(existingLink));

    assertThatThrownBy(() -> authService.loadUser(userRequest("google")))
        .isInstanceOf(OAuth2AuthenticationException.class);
  }

  @Test
  void 탈퇴한_계정과_같은_이메일로_처음_소셜_연결을_시도하면_연결을_저장하지_않고_즉시_예외를_던진다() {
    User withdrawnUser =
        new User("a@test.com", "hash", "nick", "000000", OffsetDateTime.now().plusMinutes(10));
    withdrawnUser.withdraw();
    OAuth2User googleUser = new DefaultOAuth2User(
        List.of(), Map.of("sub", "google-123", "email", "a@test.com", "name", "테스트"), "sub");
    when(delegate.loadUser(any())).thenReturn(googleUser);
    when(socialAccountRepository.findByProviderAndProviderUserId(
            SocialProvider.GOOGLE, "google-123"))
        .thenReturn(Optional.empty());
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(withdrawnUser));

    assertThatThrownBy(() -> authService.loadUser(userRequest("google")))
        .isInstanceOf(OAuth2AuthenticationException.class);

    verify(socialAccountRepository, never()).save(any());
    verify(userRepository, never()).save(any());
  }
}
