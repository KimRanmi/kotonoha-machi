package com.kotonohamachi.common;

import org.springframework.http.HttpStatus;

/** 도메인별로 정의하는 에러 종류의 공통 계약. 각 도메인 패키지는 이 인터페이스를 구현하는 enum으로 자신의 에러를 모아둔다. */
public interface ErrorCode {

  /**
   * 이 에러에 해당하는 HTTP 상태 코드를 반환한다.
   *
   * @return HTTP 상태 코드
   */
  HttpStatus getStatus();

  /**
   * 클라이언트에게 보여줄 메시지를 반환한다.
   *
   * @return 에러 메시지
   */
  String getMessage();
}
