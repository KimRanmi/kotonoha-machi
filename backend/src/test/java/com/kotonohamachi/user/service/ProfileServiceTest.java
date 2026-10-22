package com.kotonohamachi.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.dto.ProfileResponse;
import com.kotonohamachi.user.repository.UserRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

/** {@link ProfileService}의 프로필 조회/닉네임 변경/비밀번호 변경 규칙을 Mockito로 의존성을 대체해 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private PasswordEncoder passwordEncoder;

  private ProfileService profileService;

  @BeforeEach
  void setUp() {
    profileService = new ProfileService(userRepository, passwordEncoder);
  }

  private static User userWithPassword(String passwordHash) {
    return new User(
        "a@test.com", passwordHash, "nick", "123456", OffsetDateTime.now().plusMinutes(10));
  }

  @Test
  void getProfile_비밀번호가_있는_계정은_hasPassword가_true다() {
    User user = userWithPassword("hash");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    ProfileResponse response = profileService.getProfile(1L);

    assertThat(response.hasPassword()).isTrue();
    assertThat(response.email()).isEqualTo("a@test.com");
    assertThat(response.nickname()).isEqualTo("nick");
  }

  @Test
  void getProfile_비밀번호가_없는_소셜전용_계정은_hasPassword가_false다() {
    User user = User.createFromSocialLogin("social@test.com", "socialNick");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    ProfileResponse response = profileService.getProfile(1L);

    assertThat(response.hasPassword()).isFalse();
  }

  @Test
  void changePassword_올바른_현재_비밀번호면_새_비밀번호로_바꾼다() {
    User user = userWithPassword("old-hash");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("oldPassword123", "old-hash")).thenReturn(true);
    when(passwordEncoder.encode("newPassword123")).thenReturn("new-hash");

    profileService.changePassword(1L, "oldPassword123", "newPassword123");

    assertThat(user.getPasswordHash()).isEqualTo("new-hash");
  }

  @Test
  void changePassword_현재_비밀번호가_틀리면_예외를_던지고_비밀번호를_바꾸지_않는다() {
    User user = userWithPassword("old-hash");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("wrongPassword", "old-hash")).thenReturn(false);

    ApiException exception = catchThrowableOfType(
        ApiException.class,
        () -> profileService.changePassword(1L, "wrongPassword", "newPassword123"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(user.getPasswordHash()).isEqualTo("old-hash");
  }

  @Test
  void changePassword_현재_비밀번호가_빈_문자열이면_예외를_던지고_비밀번호를_바꾸지_않는다() {
    User user = userWithPassword("old-hash");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> profileService.changePassword(1L, "", "newPassword123"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(user.getPasswordHash()).isEqualTo("old-hash");
  }

  @Test
  void changePassword_현재_비밀번호가_null이면_예외를_던지고_비밀번호를_바꾸지_않는다() {
    User user = userWithPassword("old-hash");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> profileService.changePassword(1L, null, "newPassword123"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(user.getPasswordHash()).isEqualTo("old-hash");
  }

  @Test
  void changePassword_비밀번호가_없는_소셜전용_계정은_현재_비밀번호_검증_없이_성공한다() {
    User user = User.createFromSocialLogin("social@test.com", "socialNick");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(passwordEncoder.encode("newPassword123")).thenReturn("new-hash");

    profileService.changePassword(1L, null, "newPassword123");

    assertThat(user.getPasswordHash()).isEqualTo("new-hash");
  }

  @Test
  void changePassword_비밀번호가_없는_소셜전용_계정은_빈_문자열_현재_비밀번호도_허용한다() {
    User user = User.createFromSocialLogin("social@test.com", "socialNick");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(passwordEncoder.encode("newPassword123")).thenReturn("new-hash");

    profileService.changePassword(1L, "", "newPassword123");

    assertThat(user.getPasswordHash()).isEqualTo("new-hash");
    verify(passwordEncoder, never()).matches(any(), any());
  }
}
