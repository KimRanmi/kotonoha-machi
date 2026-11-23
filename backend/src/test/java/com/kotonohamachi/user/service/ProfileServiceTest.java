package com.kotonohamachi.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.Mockito.when;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.dto.ProfileResponse;
import com.kotonohamachi.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

/** {@link ProfileService}의 프로필 조회/닉네임 변경 규칙을 Mockito로 의존성을 대체해 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

  @Mock
  private UserRepository userRepository;

  private ProfileService profileService;

  @BeforeEach
  void setUp() {
    profileService = new ProfileService(userRepository);
  }

  @Test
  void getProfile_이메일과_닉네임을_돌려준다() {
    User user = User.createFromSocialLogin("a@test.com", "nick");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    ProfileResponse response = profileService.getProfile(1L);

    assertThat(response.email()).isEqualTo("a@test.com");
    assertThat(response.nickname()).isEqualTo("nick");
  }

  @Test
  void updateNickname_다른_사용자가_쓰는_닉네임이면_예외를_던지고_바꾸지_않는다() {
    User user = User.createFromSocialLogin("a@test.com", "nick");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(userRepository.existsByNickname("taken")).thenReturn(true);

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> profileService.updateNickname(1L, "taken"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(user.getNickname()).isEqualTo("nick");
  }

  @Test
  void updateNickname_본인의_현재_닉네임과_같으면_중복_검사_없이_성공한다() {
    User user = User.createFromSocialLogin("a@test.com", "nick");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    ProfileResponse response = profileService.updateNickname(1L, "nick");

    assertThat(response.nickname()).isEqualTo("nick");
  }
}
