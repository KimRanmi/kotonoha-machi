package com.kotonohamachi.common;

import org.springframework.http.HttpStatus;

/** 도메인 규칙 위반을 나타내는 예외. 상태 코드와 메시지는 직접 받지 않고, 도메인 패키지가 정의한 {@link ErrorCode}에서 가져온다. */
public class ApiException extends RuntimeException {

  private final ErrorCode errorCode;

  /**
   * 생성자.
   *
   * @param errorCode 이 예외가 나타내는 에러 종류
   */
  public ApiException(ErrorCode errorCode) {
    super(errorCode.getMessage());
    this.errorCode = errorCode;
  }

  /**
   * 응답에 사용할 HTTP 상태 코드를 반환한다.
   *
   * @return HTTP 상태 코드
   */
  public HttpStatus getStatus() {
    return errorCode.getStatus();
  }
}
