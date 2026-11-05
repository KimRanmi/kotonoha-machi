package com.kotonohamachi.theme;

import com.kotonohamachi.common.ErrorCode;
import org.springframework.http.HttpStatus;

/** 테마 학습 진행에서 발생하는 에러 종류를 모아둔다. */
public enum ThemeErrorCode implements ErrorCode {
  THEME_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 테마입니다."),
  STAGE_OUT_OF_ORDER(HttpStatus.CONFLICT, "이전 단계를 먼저 끝내야 합니다."),
  DAILY_THEME_LIMIT_REACHED(HttpStatus.CONFLICT, "오늘은 이미 테마를 하나 완료했습니다. 내일 다음 테마를 진행해 주세요.");

  private final HttpStatus status;
  private final String message;

  ThemeErrorCode(HttpStatus status, String message) {
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
