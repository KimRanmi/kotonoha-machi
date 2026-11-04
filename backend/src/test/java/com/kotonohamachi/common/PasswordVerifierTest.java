package com.kotonohamachi.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

/** {@link PasswordVerifier}가 입력값 유무와 인코더 비교 결과를 올바르게 조합하는지 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class PasswordVerifierTest {

  @Mock
  private PasswordEncoder passwordEncoder;

  @Test
  void 입력한_비밀번호가_해시와_일치하면_true를_반환한다() {
    when(passwordEncoder.matches("password123", "hash")).thenReturn(true);

    assertThat(PasswordVerifier.matches(passwordEncoder, "hash", "password123")).isTrue();
  }

  @Test
  void 입력한_비밀번호가_해시와_다르면_false를_반환한다() {
    when(passwordEncoder.matches("wrong-password", "hash")).thenReturn(false);

    assertThat(PasswordVerifier.matches(passwordEncoder, "hash", "wrong-password"))
        .isFalse();
  }

  @Test
  void 입력이_null이면_인코더를_호출하지_않고_false를_반환한다() {
    assertThat(PasswordVerifier.matches(passwordEncoder, "hash", null)).isFalse();
    verify(passwordEncoder, never()).matches(any(), any());
  }

  @Test
  void 입력이_빈_문자열이면_인코더를_호출하지_않고_false를_반환한다() {
    assertThat(PasswordVerifier.matches(passwordEncoder, "hash", "")).isFalse();
    verify(passwordEncoder, never()).matches(any(), any());
  }

  @Test
  void 입력이_공백뿐이면_인코더를_호출하지_않고_false를_반환한다() {
    assertThat(PasswordVerifier.matches(passwordEncoder, "hash", "   ")).isFalse();
    verify(passwordEncoder, never()).matches(any(), any());
  }
}
