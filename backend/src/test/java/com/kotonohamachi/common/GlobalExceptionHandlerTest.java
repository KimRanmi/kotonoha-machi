package com.kotonohamachi.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.SQLException;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

class GlobalExceptionHandlerTest {

  private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

  @Test
  void 유니크_위반이면_409와_새로고침_안내를_반환한다() {
    DataIntegrityViolationException exception = new DataIntegrityViolationException(
        "duplicate", new SQLException("duplicate key", "23505"));

    ResponseEntity<ErrorResponse> response =
        handler.handleDataIntegrityViolationException(exception);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(response.getBody().message()).isEqualTo("이미 처리된 요청입니다. 화면을 새로고침해 주세요.");
  }

  @Test
  void 유니크_위반_원인이_깊이_감싸져_있어도_409를_반환한다() {
    DataIntegrityViolationException exception = new DataIntegrityViolationException(
        "wrapped", new RuntimeException("middle", new SQLException("duplicate key", "23505")));

    ResponseEntity<ErrorResponse> response =
        handler.handleDataIntegrityViolationException(exception);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void 유니크_위반이_아닌_무결성_오류는_500을_반환한다() {
    DataIntegrityViolationException exception =
        new DataIntegrityViolationException("not null", new SQLException("null value", "23502"));

    ResponseEntity<ErrorResponse> response =
        handler.handleDataIntegrityViolationException(exception);

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    assertThat(response.getBody().message()).startsWith("서버 오류가");
  }

  @Test
  void SQL_원인이_없는_무결성_오류도_500을_반환한다() {
    ResponseEntity<ErrorResponse> response =
        handler.handleDataIntegrityViolationException(new DataIntegrityViolationException("x"));

    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
