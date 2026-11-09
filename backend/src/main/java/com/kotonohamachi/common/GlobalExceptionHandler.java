package com.kotonohamachi.common;

import java.sql.SQLException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** 컨트롤러에서 발생한 예외를 일관된 JSON 오류 응답으로 변환한다. */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  // PostgreSQL의 unique_violation SQLSTATE.
  private static final String UNIQUE_VIOLATION_SQL_STATE = "23505";

  /**
   * 도메인 규칙 위반({@link ApiException})을 처리한다.
   *
   * @param exception 발생한 예외
   * @return 예외에 담긴 상태 코드와 메시지로 만든 응답
   */
  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ErrorResponse> handleApiException(ApiException exception) {
    return ResponseEntity.status(exception.getStatus())
        .body(new ErrorResponse(exception.getMessage()));
  }

  /**
   * 요청 본문의 입력값 검증 실패를 처리한다.
   *
   * @param exception 발생한 예외
   * @return 검증 오류 메시지를 담은 400 응답
   */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleValidationException(
      MethodArgumentNotValidException exception) {
    String message = exception.getBindingResult().getFieldErrors().stream()
        .findFirst()
        .map(error -> error.getDefaultMessage())
        .orElse("요청 값이 올바르지 않습니다.");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(message));
  }

  /**
   * 요청 본문이 비어있거나 JSON 형식이 올바르지 않은 경우를 처리한다.
   *
   * @param exception 발생한 예외
   * @return 400 응답
   */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ErrorResponse> handleMessageNotReadableException(
      HttpMessageNotReadableException exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new ErrorResponse("요청 본문을 읽을 수 없습니다."));
  }

  /**
   * 필수 쿼리 파라미터가 누락된 경우를 처리한다.
   *
   * @param exception 발생한 예외
   * @return 400 응답
   */
  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<ErrorResponse> handleMissingParameterException(
      MissingServletRequestParameterException exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new ErrorResponse(exception.getParameterName() + " 파라미터가 필요합니다."));
  }

  /**
   * 파라미터 값의 타입이 올바르지 않은 경우를 처리한다.
   *
   * @param exception 발생한 예외
   * @return 400 응답
   */
  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<ErrorResponse> handleTypeMismatchException(
      MethodArgumentTypeMismatchException exception) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(new ErrorResponse(exception.getName() + " 값의 형식이 올바르지 않습니다."));
  }

  /**
   * 지원하지 않는 HTTP 메서드로 요청한 경우를 처리한다.
   *
   * @param exception 발생한 예외
   * @return 405 응답
   */
  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ErrorResponse> handleMethodNotSupportedException(
      HttpRequestMethodNotSupportedException exception) {
    return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
        .body(new ErrorResponse("지원하지 않는 요청 방식입니다."));
  }

  /**
   * 존재하지 않는 경로로 요청한 경우를 처리한다.
   *
   * @param exception 발생한 예외
   * @return 404 응답
   */
  @ExceptionHandler(NoResourceFoundException.class)
  public ResponseEntity<ErrorResponse> handleNoResourceFoundException(
      NoResourceFoundException exception) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(new ErrorResponse("요청한 경로를 찾을 수 없습니다."));
  }

  /**
   * DB 유니크 제약 위반을 처리한다. 같은 요청이 동시에 두 번 들어와(더블클릭 등) 둘 다 중복 확인을 통과한 경우에 나며, 먼저 도착한 요청이
   * 이미 처리한 상태라 409로 알려준다. 유니크 위반이 아닌 다른 무결성 오류(NOT NULL 위반 등)는 서버 버그이므로 500으로 처리한다.
   *
   * @param exception 발생한 예외
   * @return 유니크 위반이면 409 응답, 아니면 500 응답
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ErrorResponse> handleDataIntegrityViolationException(
      DataIntegrityViolationException exception) {
    if (isUniqueViolation(exception)) {
      return ResponseEntity.status(HttpStatus.CONFLICT)
          .body(new ErrorResponse("이미 처리된 요청입니다. 화면을 새로고침해 주세요."));
    }
    return handleUnexpectedException(exception);
  }

  /** 원인 예외를 따라가며 PostgreSQL 유니크 위반 코드(23505)가 있는지 확인한다. */
  private static boolean isUniqueViolation(Throwable exception) {
    for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
      if (cause instanceof SQLException sqlException
          && UNIQUE_VIOLATION_SQL_STATE.equals(sqlException.getSQLState())) {
        return true;
      }
    }
    return false;
  }

  /**
   * 그 밖에 예상하지 못한 모든 예외를 처리한다. 내부 오류 정보(스택트레이스 등)는 클라이언트에 노출하지 않고 서버 로그에만 남긴다.
   *
   * @param exception 발생한 예외
   * @return 500 응답
   */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ErrorResponse> handleUnexpectedException(Exception exception) {
    log.error("예상하지 못한 오류가 발생했습니다.", exception);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(new ErrorResponse("서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."));
  }
}
