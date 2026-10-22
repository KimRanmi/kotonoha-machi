package com.kotonohamachi.auth;

import com.kotonohamachi.common.ErrorCode;
import org.springframework.http.HttpStatus;

/** 회원가입, 이메일 인증, 로그인에서 발생하는 에러 종류를 모아둔다. */
public enum AuthErrorCode implements ErrorCode {
  EMAIL_ALREADY_VERIFIED(HttpStatus.CONFLICT, "이미 가입된 이메일입니다."),
  NICKNAME_ALREADY_IN_USE(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다."),
  SIGNUP_NOT_FOUND(HttpStatus.BAD_REQUEST, "가입 정보를 찾을 수 없습니다."),
  EMAIL_ALREADY_ACTIVATED(HttpStatus.BAD_REQUEST, "이미 인증이 완료된 계정입니다."),
  VERIFICATION_CODE_MISMATCH(HttpStatus.BAD_REQUEST, "인증 코드가 올바르지 않습니다."),
  VERIFICATION_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "인증 코드가 만료되었습니다."),
  VERIFICATION_ATTEMPTS_EXCEEDED(
      HttpStatus.TOO_MANY_REQUESTS, "인증 시도 횟수를 초과했습니다. 인증 코드를 다시 받아주세요."),
  EMAIL_SEND_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "인증 코드 이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요."),
  EMAIL_NOT_VERIFIED(HttpStatus.UNAUTHORIZED, "이메일 인증을 완료해야 로그인할 수 있습니다."),
  LOGIN_LOCKED(HttpStatus.TOO_MANY_REQUESTS, "로그인 시도가 너무 많아 잠시 후 다시 시도해주세요."),
  INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다."),
  PASSWORD_RESET_CODE_MISMATCH(HttpStatus.BAD_REQUEST, "재설정 코드가 올바르지 않습니다."),
  PASSWORD_RESET_CODE_EXPIRED(HttpStatus.BAD_REQUEST, "재설정 코드가 만료되었습니다."),
  PASSWORD_RESET_ATTEMPTS_EXCEEDED(
      HttpStatus.TOO_MANY_REQUESTS, "재설정 시도 횟수를 초과했습니다. 코드를 다시 받아주세요."),
  WITHDRAWAL_PASSWORD_MISMATCH(HttpStatus.BAD_REQUEST, "현재 비밀번호가 올바르지 않습니다.");

  private final HttpStatus status;
  private final String message;

  AuthErrorCode(HttpStatus status, String message) {
    this.status = status;
    this.message = message;
  }

  @Override
  public HttpStatus getStatus() {
    return status;
  }

  @Override
  public String getMessage() {
    return message;
  }
}
