package com.kotonohamachi.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.kotonohamachi.user.User;
import com.kotonohamachi.user.UserStatus;
import com.kotonohamachi.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** {@link AuthService}의 회원 탈퇴 규칙을 Mockito로 의존성을 대체해 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock
  private UserRepository userRepository;

  private AuthService authService;

  @BeforeEach
  void setUp() {
    authService = new AuthService(userRepository);
  }

  @Test
  void withdraw_로그인한_계정을_탈퇴_상태로_바꾼다() {
    User user = User.createFromSocialLogin("a@test.com", "nick");
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    authService.withdraw(1L);

    assertThat(user.getStatus()).isEqualTo(UserStatus.WITHDRAWN);
  }

  @Test
  void withdraw_로그인한_사용자를_찾을수없으면_예외를_던진다() {
    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.withdraw(99L)).isInstanceOf(IllegalStateException.class);
  }
}
