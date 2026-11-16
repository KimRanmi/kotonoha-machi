package com.kotonohamachi.theme;

import com.kotonohamachi.common.ErrorCode;
import org.springframework.http.HttpStatus;

/** 테마 학습 진행에서 발생하는 에러 종류를 모아둔다. */
public enum ThemeErrorCode implements ErrorCode {
  THEME_NOT_FOUND(HttpStatus.NOT_FOUND, "존재하지 않는 학습입니다."),
  STAGE_OUT_OF_ORDER(HttpStatus.CONFLICT, "이전 단계를 먼저 끝내야 합니다."),
  NOT_TODAY_THEME(HttpStatus.CONFLICT, "오늘의 학습이 아닙니다. 오늘의 학습만 진행할 수 있습니다."),
  DAILY_THEME_LIMIT_REACHED(HttpStatus.CONFLICT, "오늘은 이미 학습을 완료했어요. 내일 새 학습이 열려요.");

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
