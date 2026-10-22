package com.kotonohamachi.auth.controller;

import com.kotonohamachi.auth.AuthErrorCode;
import com.kotonohamachi.auth.dto.AuthUserResponse;
import com.kotonohamachi.auth.dto.ConfirmPasswordResetRequest;
import com.kotonohamachi.auth.dto.LoginRequest;
import com.kotonohamachi.auth.dto.NicknameAvailabilityResponse;
import com.kotonohamachi.auth.dto.RequestPasswordResetRequest;
import com.kotonohamachi.auth.dto.ResendVerificationRequest;
import com.kotonohamachi.auth.dto.SignupRequest;
import com.kotonohamachi.auth.dto.VerifyEmailRequest;
import com.kotonohamachi.auth.dto.WithdrawRequest;
import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.auth.service.AuthService;
import com.kotonohamachi.auth.service.AuthUserDetails;
import com.kotonohamachi.common.ErrorResponse;
import com.kotonohamachi.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.CookieClearingLogoutHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 회원가입, 닉네임 중복 확인, 이메일 인증, 로그인, 현재 로그인된 사용자 조회, 비밀번호 재설정 API. 로그아웃({@code POST /api/auth/logout})은 {@link com.kotonohamachi.common.SecurityConfig}에서 Spring Security의 기본 로그아웃 처리로 구성한다. */
@RestController
public class AuthController {

  private final AuthService authService;
  private final AuthenticationManager authenticationManager;
  private final SecurityContextRepository securityContextRepository =
      new HttpSessionSecurityContextRepository();

  /**
   * 생성자.
   *
   * @param authService 회원가입/이메일 인증 서비스
   * @param authenticationManager 로그인 인증을 수행하는 매니저
   */
  public AuthController(AuthService authService, AuthenticationManager authenticationManager) {
    this.authService = authService;
    this.authenticationManager = authenticationManager;
  }

  /**
   * 이메일, 비밀번호, 닉네임으로 회원가입을 시작한다. 이메일로 받은 인증 코드를 확인해야 가입이 완료된다.
   *
   * @param request 회원가입 요청 본문
   * @return 201 Created
   */
  @PostMapping("/api/auth/signup")
  public ResponseEntity<Void> signup(@Valid @RequestBody SignupRequest request) {
    authService.signup(request);
    return ResponseEntity.status(HttpStatus.CREATED).build();
  }

  /**
   * 닉네임 중복 여부를 확인한다. 가입 폼에서 실시간으로 호출하는 용도다.
   *
   * @param nickname 확인할 닉네임
   * @return 사용 가능 여부
   */
  @GetMapping("/api/auth/nickname-check")
  public NicknameAvailabilityResponse checkNickname(@RequestParam String nickname) {
    return new NicknameAvailabilityResponse(authService.isNicknameAvailable(nickname));
  }

  /**
   * 이메일로 받은 인증 코드를 확인하고 가입을 완료한다.
   *
   * @param request 이메일 인증 요청 본문
   * @return 204 No Content
   */
  @PostMapping("/api/auth/verify-email")
  public ResponseEntity<Void> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
    authService.verifyEmail(request);
    return ResponseEntity.noContent().build();
  }

  /**
   * 인증 코드를 다시 보낸다. 코드가 만료되었거나 메일을 못 받았을 때 쓴다.
   *
   * @param request 재전송 요청 본문
   * @return 204 No Content
   */
  @PostMapping("/api/auth/verify-email/resend")
  public ResponseEntity<Void> resendVerificationCode(
      @Valid @RequestBody ResendVerificationRequest request) {
    authService.resendVerificationCode(request.email());
    return ResponseEntity.noContent().build();
  }

  /**
   * 이메일/비밀번호로 로그인하고 세션을 발급한다. 이메일 인증이 끝나지 않은 계정은 로그인할 수 없다. 비밀번호를
   * 일정 횟수 이상 틀리면 계정이 잠긴다({@link com.kotonohamachi.auth.service.AuthUserDetails#isAccountNonLocked()}
   * 참고).
   *
   * @param request 로그인 요청 본문
   * @param httpRequest 현재 요청(세션에 인증 정보를 저장하기 위해 필요)
   * @param httpResponse 현재 응답(세션 쿠키를 내려주기 위해 필요)
   * @return 로그인한 사용자 정보
   */
  @PostMapping("/api/auth/login")
  public AuthUserResponse login(
      @Valid @RequestBody LoginRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    Authentication authentication;
    try {
      authentication = authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(request.email(), request.password()));
    } catch (BadCredentialsException exception) {
      authService.recordLoginFailure(request.email());
      throw exception;
    }
    authService.recordLoginSuccess(request.email());

    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);
    securityContextRepository.saveContext(context, httpRequest, httpResponse);

    User authenticatedUser = ((AuthUserDetails) authentication.getPrincipal()).getUser();
    return new AuthUserResponse(
        authenticatedUser.getId(), authenticatedUser.getEmail(), authenticatedUser.getNickname());
  }

  /**
   * 현재 로그인된 사용자 정보를 반환한다. 비밀번호 로그인/소셜 로그인 둘 다 지원한다. 로그인하지 않았으면 Spring
   * Security가 401을 반환한다(이 메서드까지 오지 않는다).
   *
   * @param authentication 현재 요청의 인증 정보
   * @return 현재 로그인한 사용자 정보
   */
  @GetMapping("/api/auth/me")
  public AuthUserResponse me(Authentication authentication) {
    User user = AuthPrincipal.resolve(authentication);
    return new AuthUserResponse(user.getId(), user.getEmail(), user.getNickname());
  }

  /**
   * 현재 로그인한 계정을 탈퇴 처리한다. 비밀번호가 있는 계정은 현재 비밀번호를 재확인하고, 소셜 로그인만으로
   * 가입해 비밀번호가 없는 계정은 재확인 없이 탈퇴한다. 탈퇴 후에는 현재 세션을 즉시 무효화하고, {@code
   * /api/auth/logout}과 동일하게 {@code JSESSIONID} 쿠키도 함께 삭제한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param request 탈퇴 요청 본문
   * @param httpRequest 현재 요청(세션을 무효화하기 위해 필요)
   * @param httpResponse 현재 응답(세션 쿠키를 삭제하기 위해 필요)
   * @return 204 No Content
   */
  @DeleteMapping("/api/auth/me")
  public ResponseEntity<Void> withdraw(
      Authentication authentication,
      @Valid @RequestBody WithdrawRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    User user = AuthPrincipal.resolve(authentication);
    authService.withdraw(user.getId(), request.currentPassword());

    new SecurityContextLogoutHandler().logout(httpRequest, httpResponse, authentication);
    new CookieClearingLogoutHandler("JSESSIONID").logout(httpRequest, httpResponse, authentication);

    return ResponseEntity.noContent().build();
  }

  /**
   * 비밀번호 재설정 코드를 요청한다. 가입된 이메일인지 여부와 상관없이 항상 204를 반환한다(계정 존재 여부를
   * 노출하지 않기 위해).
   *
   * @param request 재설정 코드 요청 본문
   * @return 204 No Content
   */
  @PostMapping("/api/auth/password-reset/request")
  public ResponseEntity<Void> requestPasswordReset(
      @Valid @RequestBody RequestPasswordResetRequest request) {
    authService.requestPasswordReset(request.email());
    return ResponseEntity.noContent().build();
  }

  /**
   * 비밀번호 재설정 코드를 확인하고 비밀번호를 바꾼다.
   *
   * @param request 재설정 확인 요청 본문
   * @return 204 No Content
   */
  @PostMapping("/api/auth/password-reset/confirm")
  public ResponseEntity<Void> confirmPasswordReset(
      @Valid @RequestBody ConfirmPasswordResetRequest request) {
    authService.confirmPasswordReset(request);
    return ResponseEntity.noContent().build();
  }

  /**
   * 이메일 인증이 끝나지 않은 계정의 로그인 시도를 처리한다. {@link #login}에서만 발생하는 예외라 전역이 아니라 이
   * 컨트롤러에 둔다.
   *
   * @param exception 발생한 예외
   * @return 안내 메시지를 담은 401 응답
   */
  @ExceptionHandler(DisabledException.class)
  public ResponseEntity<ErrorResponse> handleDisabledException(DisabledException exception) {
    return ResponseEntity.status(AuthErrorCode.EMAIL_NOT_VERIFIED.getStatus())
        .body(new ErrorResponse(AuthErrorCode.EMAIL_NOT_VERIFIED.getMessage()));
  }

  /**
   * 비밀번호를 너무 많이 틀려 잠긴 계정의 로그인 시도를 처리한다.
   *
   * @param exception 발생한 예외
   * @return 안내 메시지를 담은 429 응답
   */
  @ExceptionHandler(LockedException.class)
  public ResponseEntity<ErrorResponse> handleLockedException(LockedException exception) {
    return ResponseEntity.status(AuthErrorCode.LOGIN_LOCKED.getStatus())
        .body(new ErrorResponse(AuthErrorCode.LOGIN_LOCKED.getMessage()));
  }

  /**
   * 그 밖의 로그인 인증 실패(이메일 또는 비밀번호 불일치)를 처리한다. 어느 쪽이 틀렸는지는 알려주지 않는다.
   *
   * @param exception 발생한 인증 예외
   * @return 401 응답
   */
  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<ErrorResponse> handleAuthenticationException(
      AuthenticationException exception) {
    return ResponseEntity.status(AuthErrorCode.INVALID_CREDENTIALS.getStatus())
        .body(new ErrorResponse(AuthErrorCode.INVALID_CREDENTIALS.getMessage()));
  }
}
