package com.kotonohamachi.auth.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kotonohamachi.auth.dto.ConfirmPasswordResetRequest;
import com.kotonohamachi.auth.dto.SignupRequest;
import com.kotonohamachi.auth.dto.VerifyEmailRequest;
import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.UserStatus;
import com.kotonohamachi.user.repository.UserRepository;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

/** {@link AuthService}의 핵심 비즈니스 규칙(중복 체크, 인증 코드 생성/만료/일치 검증)을 Mockito로 의존성을 대체해 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private PasswordEncoder passwordEncoder;

  @Mock
  private EmailSender emailSender;

  private AuthService authService;

  @BeforeEach
  void setUp() {
    authService = new AuthService(userRepository, passwordEncoder, emailSender);
  }

  @Test
  void signup_이미_인증완료된_이메일이면_예외를_던진다() {
    User activeUser =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    activeUser.activate();
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(activeUser));
    SignupRequest request = new SignupRequest("a@test.com", "password123", "nick2");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.signup(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
    verify(userRepository, never()).save(any());
    verify(emailSender, never()).sendVerificationCode(anyString(), anyString());
  }

  @Test
  void signup_이미_사용중인_닉네임이면_예외를_던진다() {
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.empty());
    when(userRepository.existsByNickname("nick")).thenReturn(true);
    SignupRequest request = new SignupRequest("a@test.com", "password123", "nick");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.signup(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
    verify(userRepository, never()).save(any());
  }

  @Test
  void signup_정상_요청이면_사용자를_저장하고_인증코드를_발송한다() {
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.empty());
    when(userRepository.existsByNickname("nick")).thenReturn(false);
    when(passwordEncoder.encode("password123")).thenReturn("encoded-password");
    SignupRequest request = new SignupRequest("a@test.com", "password123", "nick");

    authService.signup(request);

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(userRepository).save(userCaptor.capture());
    User savedUser = userCaptor.getValue();

    assertThat(savedUser.getEmail()).isEqualTo("a@test.com");
    assertThat(savedUser.getPasswordHash()).isEqualTo("encoded-password");
    assertThat(savedUser.getNickname()).isEqualTo("nick");
    assertThat(savedUser.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq("a@test.com"), codeCaptor.capture());
    String sentCode = codeCaptor.getValue();

    assertThat(sentCode).matches("^[0-9]{6}$");
    assertThat(savedUser.matchesVerificationCode(sentCode)).isTrue();
    assertThat(savedUser.isVerificationCodeExpired()).isFalse();
  }

  @Test
  void signup_인증안된_같은_이메일로_다시_요청하면_새로_만들지_않고_기존_정보를_덮어쓴다() {
    User pendingUser = new User(
        "a@test.com", "old-hash", "nick", "000000", OffsetDateTime.now().minusMinutes(1));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(pendingUser));
    when(passwordEncoder.encode("newPassword123")).thenReturn("new-hash");
    SignupRequest request = new SignupRequest("a@test.com", "newPassword123", "nick");

    authService.signup(request);

    verify(userRepository, never()).save(any());
    assertThat(pendingUser.getPasswordHash()).isEqualTo("new-hash");
    assertThat(pendingUser.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq("a@test.com"), codeCaptor.capture());
    assertThat(pendingUser.matchesVerificationCode(codeCaptor.getValue())).isTrue();
    assertThat(pendingUser.isVerificationCodeExpired()).isFalse();
  }

  @Test
  void signup_인증안된_같은_이메일로_닉네임을_바꾸지_않고_재시도하면_닉네임_중복_검사에_걸리지_않는다() {
    User pendingUser = new User(
        "a@test.com", "old-hash", "nick", "000000", OffsetDateTime.now().minusMinutes(1));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(pendingUser));
    when(passwordEncoder.encode("newPassword123")).thenReturn("new-hash");
    SignupRequest request = new SignupRequest("a@test.com", "newPassword123", "nick");

    authService.signup(request);

    verify(userRepository, never()).existsByNickname(any());
  }

  @Test
  void isNicknameAvailable_사용중이면_false를_반환한다() {
    when(userRepository.existsByNickname("nick")).thenReturn(true);

    assertThat(authService.isNicknameAvailable("nick")).isFalse();
  }

  @Test
  void isNicknameAvailable_사용가능하면_true를_반환한다() {
    when(userRepository.existsByNickname("nick")).thenReturn(false);

    assertThat(authService.isNicknameAvailable("nick")).isTrue();
  }

  @Test
  void verifyEmail_가입정보가_없으면_예외를_던진다() {
    when(userRepository.findByEmail("none@test.com")).thenReturn(Optional.empty());
    VerifyEmailRequest request = new VerifyEmailRequest("none@test.com", "123456");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.verifyEmail(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void verifyEmail_이미_인증완료된_계정이면_예외를_던진다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    user.activate();
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    VerifyEmailRequest request = new VerifyEmailRequest("a@test.com", "123456");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.verifyEmail(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void verifyEmail_코드가_일치하지_않으면_예외를_던지고_상태를_바꾸지_않는다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    VerifyEmailRequest request = new VerifyEmailRequest("a@test.com", "000000");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.verifyEmail(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
  }

  @Test
  void verifyEmail_코드가_만료되었으면_예외를_던지고_상태를_바꾸지_않는다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().minusMinutes(1));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    VerifyEmailRequest request = new VerifyEmailRequest("a@test.com", "123456");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.verifyEmail(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
  }

  @Test
  void verifyEmail_코드가_올바르고_만료되지_않았으면_계정을_활성화한다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    VerifyEmailRequest request = new VerifyEmailRequest("a@test.com", "123456");

    authService.verifyEmail(request);

    assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
    assertThat(user.matchesVerificationCode("123456")).isFalse();
    assertThat(user.isVerificationCodeExpired()).isTrue();
  }

  @Test
  void resendVerificationCode_가입정보가_없으면_예외를_던진다() {
    when(userRepository.findByEmail("none@test.com")).thenReturn(Optional.empty());

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> authService.resendVerificationCode("none@test.com"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    verify(emailSender, never()).sendVerificationCode(anyString(), anyString());
  }

  @Test
  void resendVerificationCode_이미_인증완료된_계정이면_예외를_던진다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    user.activate();
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> authService.resendVerificationCode("a@test.com"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    verify(emailSender, never()).sendVerificationCode(anyString(), anyString());
  }

  @Test
  void resendVerificationCode_정상_요청이면_새_코드를_발급하고_발송한다() {
    User user =
        new User("a@test.com", "hash", "nick", "000000", OffsetDateTime.now().minusMinutes(1));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));

    authService.resendVerificationCode("a@test.com");

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendVerificationCode(eq("a@test.com"), codeCaptor.capture());
    String newCode = codeCaptor.getValue();

    assertThat(newCode).matches("^[0-9]{6}$");
    assertThat(user.matchesVerificationCode(newCode)).isTrue();
    assertThat(user.isVerificationCodeExpired()).isFalse();
    assertThat(user.getPasswordHash()).isEqualTo("hash");
    assertThat(user.getNickname()).isEqualTo("nick");
  }

  @Test
  void verifyEmail_코드를_틀리면_시도_횟수가_늘어난다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    VerifyEmailRequest request = new VerifyEmailRequest("a@test.com", "000000");

    catchThrowableOfType(ApiException.class, () -> authService.verifyEmail(request));

    assertThat(user.getVerificationAttempts()).isEqualTo(1);
  }

  @Test
  void verifyEmail_시도_횟수를_초과하면_코드가_맞아도_429를_반환한다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    for (int i = 0; i < 5; i++) {
      user.recordVerificationFailure();
    }
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    VerifyEmailRequest request = new VerifyEmailRequest("a@test.com", "123456");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.verifyEmail(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
  }

  @Test
  void recordLoginFailure_기준치_미만이면_잠그지_않는다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));

    authService.recordLoginFailure("a@test.com");

    assertThat(user.getLoginFailCount()).isEqualTo(1);
    assertThat(user.isLoginLocked()).isFalse();
  }

  @Test
  void recordLoginFailure_기준치에_도달하면_계정을_잠근다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));

    for (int i = 0; i < 5; i++) {
      authService.recordLoginFailure("a@test.com");
    }

    assertThat(user.isLoginLocked()).isTrue();
    assertThat(user.getLoginFailCount()).isZero();
  }

  @Test
  void recordLoginSuccess_실패_횟수와_잠금을_초기화한다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    user.lockLoginFor(Duration.ofMinutes(15));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));

    authService.recordLoginSuccess("a@test.com");

    assertThat(user.getLoginFailCount()).isZero();
    assertThat(user.isLoginLocked()).isFalse();
  }

  @Test
  void requestPasswordReset_가입된_이메일이면_코드를_발급하고_발송한다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));

    authService.requestPasswordReset("a@test.com");

    ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
    verify(emailSender).sendPasswordResetCode(eq("a@test.com"), codeCaptor.capture());
    String code = codeCaptor.getValue();

    assertThat(code).matches("^[0-9]{6}$");
    assertThat(user.matchesPasswordResetCode(code)).isTrue();
    assertThat(user.isPasswordResetCodeExpired()).isFalse();
  }

  @Test
  void requestPasswordReset_가입되지_않은_이메일이면_아무것도_안_보내지만_예외도_안_던진다() {
    when(userRepository.findByEmail("none@test.com")).thenReturn(Optional.empty());

    authService.requestPasswordReset("none@test.com");

    verify(emailSender, never()).sendPasswordResetCode(anyString(), anyString());
  }

  @Test
  void confirmPasswordReset_가입되지_않은_이메일이면_코드_불일치와_같은_메시지로_거부한다() {
    when(userRepository.findByEmail("none@test.com")).thenReturn(Optional.empty());
    ConfirmPasswordResetRequest request =
        new ConfirmPasswordResetRequest("none@test.com", "123456", "newPassword123");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.confirmPasswordReset(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
  }

  @Test
  void confirmPasswordReset_코드가_틀리면_시도_횟수가_늘어난다() {
    User user = new User("a@test.com", "old-hash", "nick", "verify-code", OffsetDateTime.now());
    user.issuePasswordResetCode("123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    ConfirmPasswordResetRequest request =
        new ConfirmPasswordResetRequest("a@test.com", "000000", "newPassword123");

    catchThrowableOfType(ApiException.class, () -> authService.confirmPasswordReset(request));

    assertThat(user.getPasswordResetAttempts()).isEqualTo(1);
    assertThat(user.getPasswordHash()).isEqualTo("old-hash");
  }

  @Test
  void confirmPasswordReset_시도_횟수를_초과하면_코드가_맞아도_429를_반환한다() {
    User user = new User("a@test.com", "old-hash", "nick", "verify-code", OffsetDateTime.now());
    user.issuePasswordResetCode("123456", OffsetDateTime.now().plusMinutes(10));
    for (int i = 0; i < 5; i++) {
      user.recordPasswordResetFailure();
    }
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    ConfirmPasswordResetRequest request =
        new ConfirmPasswordResetRequest("a@test.com", "123456", "newPassword123");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.confirmPasswordReset(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
  }

  @Test
  void confirmPasswordReset_코드가_만료되었으면_예외를_던진다() {
    User user = new User("a@test.com", "old-hash", "nick", "verify-code", OffsetDateTime.now());
    user.issuePasswordResetCode("123456", OffsetDateTime.now().minusMinutes(1));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    ConfirmPasswordResetRequest request =
        new ConfirmPasswordResetRequest("a@test.com", "123456", "newPassword123");

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.confirmPasswordReset(request));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(user.getPasswordHash()).isEqualTo("old-hash");
  }

  @Test
  void confirmPasswordReset_코드가_올바르고_만료되지_않았으면_비밀번호를_바꾸고_잠금도_푼다() {
    User user = new User("a@test.com", "old-hash", "nick", "verify-code", OffsetDateTime.now());
    user.issuePasswordResetCode("123456", OffsetDateTime.now().plusMinutes(10));
    user.lockLoginFor(Duration.ofMinutes(15));
    when(userRepository.findByEmail("a@test.com")).thenReturn(Optional.of(user));
    when(passwordEncoder.encode("newPassword123")).thenReturn("new-hash");
    ConfirmPasswordResetRequest request =
        new ConfirmPasswordResetRequest("a@test.com", "123456", "newPassword123");

    authService.confirmPasswordReset(request);

    assertThat(user.getPasswordHash()).isEqualTo("new-hash");
    assertThat(user.matchesPasswordResetCode("123456")).isFalse();
    assertThat(user.isLoginLocked()).isFalse();
  }

  @Test
  void withdraw_비밀번호가_있는_계정은_현재_비밀번호가_맞으면_탈퇴처리된다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("password123", "hash")).thenReturn(true);

    authService.withdraw(1L, "password123");

    assertThat(user.getStatus()).isEqualTo(UserStatus.WITHDRAWN);
  }

  @Test
  void withdraw_비밀번호가_있는_계정은_현재_비밀번호가_틀리면_예외를_던지고_탈퇴하지_않는다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("wrong-password", "hash")).thenReturn(false);

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.withdraw(1L, "wrong-password"));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(user.getStatus()).isNotEqualTo(UserStatus.WITHDRAWN);
  }

  @Test
  void withdraw_비밀번호가_있는_계정인데_빈_문자열을_보내면_비밀번호_확인_없이_바로_거부한다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.withdraw(1L, ""));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(user.getStatus()).isNotEqualTo(UserStatus.WITHDRAWN);
    verify(passwordEncoder, never()).matches(any(), any());
  }

  @Test
  void withdraw_비밀번호가_있는_계정인데_비밀번호를_보내지_않으면_거부한다() {
    User user =
        new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));

    ApiException exception =
        catchThrowableOfType(ApiException.class, () -> authService.withdraw(1L, null));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(user.getStatus()).isNotEqualTo(UserStatus.WITHDRAWN);
    verify(passwordEncoder, never()).matches(any(), any());
  }

  @Test
  void withdraw_비밀번호가_없는_소셜전용_계정은_확인없이_탈퇴처리된다() {
    User socialUser = User.createFromSocialLogin("social@test.com", "nick");
    when(userRepository.findById(2L)).thenReturn(Optional.of(socialUser));

    authService.withdraw(2L, null);

    assertThat(socialUser.getStatus()).isEqualTo(UserStatus.WITHDRAWN);
    verify(passwordEncoder, never()).matches(any(), any());
  }

  @Test
  void withdraw_로그인한_사용자를_찾을수없으면_예외를_던진다() {
    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> authService.withdraw(99L, "password123"))
        .isInstanceOf(IllegalStateException.class);
  }
}
