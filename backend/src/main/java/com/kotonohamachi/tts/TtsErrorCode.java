package com.kotonohamachi.tts;

import com.kotonohamachi.common.ErrorCode;
import org.springframework.http.HttpStatus;

/** 음성 합성(TTS)에서 발생하는 에러 종류를 모아둔다. */
public enum TtsErrorCode implements ErrorCode {
  TEXT_INVALID(HttpStatus.BAD_REQUEST, "읽어줄 문장이 비어 있거나 너무 깁니다."),
  DAILY_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "오늘 새로 만들 수 있는 음성 횟수를 모두 사용했습니다."),
  UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "음성 합성을 사용할 수 없습니다."),
  SYNTHESIS_FAILED(HttpStatus.BAD_GATEWAY, "음성을 만들지 못했습니다.");

  private final HttpStatus status;
  private final String message;

  TtsErrorCode(HttpStatus status, String message) {
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
