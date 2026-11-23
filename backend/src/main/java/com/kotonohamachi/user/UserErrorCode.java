package com.kotonohamachi.user;

import com.kotonohamachi.common.ErrorCode;
import org.springframework.http.HttpStatus;

/** 프로필 조회/수정에서 발생하는 에러 종류를 모아둔다. */
public enum UserErrorCode implements ErrorCode {
  NICKNAME_ALREADY_IN_USE(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다.");

  private final HttpStatus status;
  private final String message;

  UserErrorCode(HttpStatus status, String message) {
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
