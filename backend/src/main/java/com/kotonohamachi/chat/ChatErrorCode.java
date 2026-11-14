package com.kotonohamachi.chat;

import com.kotonohamachi.common.ErrorCode;
import org.springframework.http.HttpStatus;

/** 주민과의 대화에서 발생하는 에러 종류를 모아둔다. */
public enum ChatErrorCode implements ErrorCode {
  MESSAGE_INVALID(HttpStatus.BAD_REQUEST, "메시지가 비어 있거나 너무 깁니다."),
  RESIDENT_NOT_FOUND(HttpStatus.NOT_FOUND, "주민을 찾을 수 없습니다."),
  DAILY_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "오늘은 이야기를 많이 해서 졸려요. 내일 또 이야기해요."),
  UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "주민과 대화할 수 없습니다."),
  GENERATION_FAILED(HttpStatus.BAD_GATEWAY, "주민의 대답을 만들지 못했습니다.");

  private final HttpStatus status;
  private final String message;

  ChatErrorCode(HttpStatus status, String message) {
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
