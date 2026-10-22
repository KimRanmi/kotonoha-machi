package com.kotonohamachi.auth.service;

import com.kotonohamachi.auth.AuthErrorCode;
import com.kotonohamachi.auth.dto.ConfirmPasswordResetRequest;
import com.kotonohamachi.auth.dto.SignupRequest;
import com.kotonohamachi.auth.dto.VerifyEmailRequest;
import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.common.PasswordVerifier;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.UserStatus;
import com.kotonohamachi.user.repository.UserRepository;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 회원가입, 닉네임 중복 확인, 이메일 인증을 처리한다. 로그인/로그아웃은 Spring Security가 처리하므로 이 서비스가 아니라 {@link com.kotonohamachi.common.SecurityConfig}가 담당한다. */
@Service
public class AuthService {

  private static final int CODE_LENGTH = 6;
  private static final Duration VERIFICATION_CODE_TTL = Duration.ofMinutes(10);
  private static final int MAX_VERIFICATION_ATTEMPTS = 5;
  private static final int MAX_LOGIN_ATTEMPTS = 5;
  private static final Duration LOGIN_LOCK_DURATION = Duration.ofMinutes(15);
  private static final Duration PASSWORD_RESET_CODE_TTL = Duration.ofMinutes(10);
  private static final int MAX_PASSWORD_RESET_ATTEMPTS = 5;

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final EmailSender emailSender;

  /**
   * 생성자.
   *
   * @param userRepository 사용자 저장소
   * @param passwordEncoder 비밀번호 해시 인코더
   * @param emailSender 이메일 발송기
   */
  public AuthService(
      UserRepository userRepository, PasswordEncoder passwordEncoder, EmailSender emailSender) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
    this.emailSender = emailSender;
  }

  /**
   * 이메일, 비밀번호, 닉네임으로 회원가입을 시작한다. 이메일로 인증 코드를 보내고, 그 코드를 확인해야 가입이 완료된다. 그전까지 계정은 {@link UserStatus#PENDING_VERIFICATION} 상태라 로그인할 수 없다.
   *
   * @param request 회원가입 요청
   */
  @Transactional
  public void signup(SignupRequest request) {
    Optional<User> existing = userRepository.findByEmail(request.email());
    if (existing.isPresent() && existing.get().getStatus() == UserStatus.ACTIVE) {
      throw new ApiException(AuthErrorCode.EMAIL_ALREADY_VERIFIED);
    }

    boolean nicknameIsOwnedByThisPendingSignup =
        existing.isPresent() && existing.get().getNickname().equals(request.nickname());
    if (!nicknameIsOwnedByThisPendingSignup
        && userRepository.existsByNickname(request.nickname())) {
      throw new ApiException(AuthErrorCode.NICKNAME_ALREADY_IN_USE);
    }

    String verificationCode = generateCode();
    OffsetDateTime expiresAt = OffsetDateTime.now().plus(VERIFICATION_CODE_TTL);
    String passwordHash = passwordEncoder.encode(request.password());

    if (existing.isPresent()) {
      // 인증을 끝내지 않은 채(PENDING_VERIFICATION) 같은 이메일로 가입을 다시 시도하는 경우다.
      // email에 DB UNIQUE 제약이 있어 새 행을 또 넣을 수 없으니, 기존 행을 덮어쓴다.
      existing
          .get()
          .restartPendingSignup(passwordHash, request.nickname(), verificationCode, expiresAt);
    } else {
      userRepository.save(
          new User(request.email(), passwordHash, request.nickname(), verificationCode, expiresAt));
    }
    emailSender.sendVerificationCode(request.email(), verificationCode);
  }

  /**
   * 인증 코드를 다시 보낸다. 코드가 만료되었거나 메일을 못 받았을 때 쓴다. 비밀번호/닉네임은 바꾸지 않는다.
   *
   * @param email 인증 코드를 다시 받을 이메일
   */
  @Transactional
  public void resendVerificationCode(String email) {
    User user = userRepository
        .findByEmail(email)
        .orElseThrow(() -> new ApiException(AuthErrorCode.SIGNUP_NOT_FOUND));
    if (user.getStatus() == UserStatus.ACTIVE) {
      throw new ApiException(AuthErrorCode.EMAIL_ALREADY_ACTIVATED);
    }

    String verificationCode = generateCode();
    user.renewVerificationCode(verificationCode, OffsetDateTime.now().plus(VERIFICATION_CODE_TTL));
    emailSender.sendVerificationCode(email, verificationCode);
  }

  /**
   * 닉네임 중복 여부를 확인한다. 가입 폼에서 실시간으로 호출하는 용도다.
   *
   * @param nickname 확인할 닉네임
   * @return 사용 가능하면 true
   */
  @Transactional(readOnly = true)
  public boolean isNicknameAvailable(String nickname) {
    return !userRepository.existsByNickname(nickname);
  }

  /**
   * 이메일로 받은 인증 코드를 확인하고, 맞으면 계정을 활성화해 가입을 완료한다. 코드가 틀렸을 때 늘어난 시도 횟수는
   * 저장해야 하므로, {@link ApiException}을 던져도 트랜잭션을 롤백하지 않는다(기본 동작은 RuntimeException에서
   * 롤백인데, 그러면 방금 늘린 시도 횟수까지 함께 사라진다).
   *
   * @param request 이메일 인증 요청
   */
  @Transactional(noRollbackFor = ApiException.class)
  public void verifyEmail(VerifyEmailRequest request) {
    User user = userRepository
        .findByEmail(request.email())
        .orElseThrow(() -> new ApiException(AuthErrorCode.SIGNUP_NOT_FOUND));

    if (user.getStatus() == UserStatus.ACTIVE) {
      throw new ApiException(AuthErrorCode.EMAIL_ALREADY_ACTIVATED);
    }
    if (user.getVerificationAttempts() >= MAX_VERIFICATION_ATTEMPTS) {
      throw new ApiException(AuthErrorCode.VERIFICATION_ATTEMPTS_EXCEEDED);
    }
    if (!user.matchesVerificationCode(request.code())) {
      user.recordVerificationFailure();
      throw new ApiException(AuthErrorCode.VERIFICATION_CODE_MISMATCH);
    }
    if (user.isVerificationCodeExpired()) {
      throw new ApiException(AuthErrorCode.VERIFICATION_CODE_EXPIRED);
    }

    user.activate();
  }

  /**
   * 로그인 비밀번호를 틀렸을 때 실패 횟수를 늘리고, 기준치를 넘으면 계정을 잠근다. 가입된 이메일이 아니면 아무 일도
   * 하지 않는다(어느 쪽이 틀렸는지 알려주지 않기 위해).
   *
   * @param email 로그인을 시도한 이메일
   */
  @Transactional
  public void recordLoginFailure(String email) {
    userRepository.findByEmail(email).ifPresent(user -> {
      user.recordLoginFailure();
      if (user.getLoginFailCount() >= MAX_LOGIN_ATTEMPTS) {
        user.lockLoginFor(LOGIN_LOCK_DURATION);
      }
    });
  }

  /**
   * 로그인에 성공했을 때 실패 횟수와 잠금을 초기화한다.
   *
   * @param email 로그인에 성공한 이메일
   */
  @Transactional
  public void recordLoginSuccess(String email) {
    userRepository.findByEmail(email).ifPresent(User::resetLoginFailures);
  }

  /**
   * 비밀번호 재설정 코드를 발급해 메일로 보낸다. 가입된 이메일인지 여부를 노출하지 않기 위해, 가입된 이메일이
   * 아니어도 예외 없이 그냥 끝낸다.
   *
   * @param email 재설정 코드를 받을 이메일
   */
  @Transactional
  public void requestPasswordReset(String email) {
    userRepository.findByEmail(email).ifPresent(user -> {
      String code = generateCode();
      user.issuePasswordResetCode(code, OffsetDateTime.now().plus(PASSWORD_RESET_CODE_TTL));
      emailSender.sendPasswordResetCode(email, code);
    });
  }

  /**
   * 비밀번호 재설정 코드를 확인하고, 맞으면 비밀번호를 바꾼다. 가입된 이메일이 아닌 경우도 코드 불일치와 같은
   * 메시지로 응답해, 가입 여부를 노출하지 않는다. 코드가 틀렸을 때 늘어난 시도 횟수는 저장해야 하므로 {@link
   * ApiException}을 던져도 트랜잭션을 롤백하지 않는다.
   *
   * @param request 비밀번호 재설정 확인 요청
   */
  @Transactional(noRollbackFor = ApiException.class)
  public void confirmPasswordReset(ConfirmPasswordResetRequest request) {
    User user = userRepository
        .findByEmail(request.email())
        .orElseThrow(() -> new ApiException(AuthErrorCode.PASSWORD_RESET_CODE_MISMATCH));

    if (user.getPasswordResetAttempts() >= MAX_PASSWORD_RESET_ATTEMPTS) {
      throw new ApiException(AuthErrorCode.PASSWORD_RESET_ATTEMPTS_EXCEEDED);
    }
    if (!user.matchesPasswordResetCode(request.code())) {
      user.recordPasswordResetFailure();
      throw new ApiException(AuthErrorCode.PASSWORD_RESET_CODE_MISMATCH);
    }
    if (user.isPasswordResetCodeExpired()) {
      throw new ApiException(AuthErrorCode.PASSWORD_RESET_CODE_EXPIRED);
    }

    user.resetPassword(passwordEncoder.encode(request.newPassword()));
  }

  /**
   * 로그인한 본인의 회원 탈퇴를 처리한다. 이미 비밀번호가 있는 계정은 현재 비밀번호가 맞는지 먼저 확인하고,
   * 소셜 로그인만으로 가입해 비밀번호가 없는 계정은 확인 없이 탈퇴 처리한다.
   *
   * @param userId 탈퇴할 사용자 ID(로그인한 본인)
   * @param currentPassword 현재 비밀번호(비밀번호가 없는 계정은 비워서 보낼 수 있다)
   */
  @Transactional
  public void withdraw(Long userId, String currentPassword) {
    User user = userRepository
        .findById(userId)
        .orElseThrow(() -> new IllegalStateException("로그인한 사용자를 찾을 수 없습니다."));

    if (user.getPasswordHash() != null
        && !PasswordVerifier.matches(passwordEncoder, user.getPasswordHash(), currentPassword)) {
      throw new ApiException(AuthErrorCode.WITHDRAWAL_PASSWORD_MISMATCH);
    }

    user.withdraw();
  }

  private String generateCode() {
    int bound = (int) Math.pow(10, CODE_LENGTH);
    int code = ThreadLocalRandom.current().nextInt(bound);
    return String.format("%0" + CODE_LENGTH + "d", code);
  }
}
