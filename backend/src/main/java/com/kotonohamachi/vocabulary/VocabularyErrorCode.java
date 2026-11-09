package com.kotonohamachi.vocabulary;

import com.kotonohamachi.common.ErrorCode;
import org.springframework.http.HttpStatus;

/** 단어장 저장에서 발생하는 에러 종류를 모아둔다. */
public enum VocabularyErrorCode implements ErrorCode {
  SAVE_CONFLICT(HttpStatus.CONFLICT, "단어장에 단어를 저장하던 중 같은 요청이 동시에 처리되었습니다. 화면을 새로고침해 주세요.");

  private final HttpStatus status;
  private final String message;

  VocabularyErrorCode(HttpStatus status, String message) {
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
