package com.kotonohamachi.vocabulary;

import com.kotonohamachi.common.ErrorCode;
import org.springframework.http.HttpStatus;

/** 단어장 저장에서 발생하는 에러 종류를 모아둔다. */
public enum VocabularyErrorCode implements ErrorCode {
  SAVE_CONFLICT(HttpStatus.CONFLICT, "단어장에 단어를 저장하던 중 같은 요청이 동시에 처리되었습니다. 화면을 새로고침해 주세요."),
  WORD_INVALID(HttpStatus.BAD_REQUEST, "저장할 단어는 공백 없이 1~30자로 골라 주세요."),
  WORD_NOT_FOUND(HttpStatus.NOT_FOUND, "사전에서 찾을 수 없는 단어예요. 활용형이라면 기본형(사전형)으로 골라 보세요."),
  DAILY_WORD_LIMIT_EXCEEDED(
      HttpStatus.TOO_MANY_REQUESTS, "오늘은 대화에서 저장할 수 있는 단어를 모두 저장했어요. 내일 다시 저장해 보세요."),
  DICTIONARY_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "사전을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");

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
