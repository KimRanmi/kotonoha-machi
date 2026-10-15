package com.kotonoha.common;

import com.kotonoha.llm.GeminiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// 프론트는 에러 응답을 { error: "..." } 형태로 기대한다 (기존 Next.js route.ts와 동일한 계약).
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    public record ErrorResponse(String error) {}

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApi(ApiException e) {
        return ResponseEntity.status(e.status()).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getDefaultMessage())
                .findFirst()
                .orElse("잘못된 요청입니다.");
        return ResponseEntity.badRequest().body(new ErrorResponse(message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(new ErrorResponse("잘못된 요청입니다."));
    }

    // 장애 유형별 안정적인 에러 코드. 사용자 문구는 짧게만 주고, 키/모델/HTTP 상태 같은 상세 원인은
    // 응답에 싣지 않고 로그에만 남긴다 (대화 내용과 API 키는 로그에도 남기지 않는다).
    public record GeminiErrorResponse(String error, String code) {}

    @ExceptionHandler(GeminiException.class)
    public ResponseEntity<GeminiErrorResponse> handleGemini(GeminiException e) {
        return switch (e.kind()) {
            case TRANSIENT -> {
                log.warn("Gemini 호출 실패 kind=TRANSIENT upstreamStatus={} reason={}", e.upstreamStatus(), e.getMessage());
                yield ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new GeminiErrorResponse(
                        "지금 주민이 바빠서 응답하지 못했어요. 잠시 후 다시 시도해 주세요.", "GEMINI_TRANSIENT"));
            }
            case CONFIG -> {
                log.error("Gemini 호출 실패 kind=CONFIG upstreamStatus={} reason={}", e.upstreamStatus(), e.getMessage());
                yield ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new GeminiErrorResponse(
                        "문제가 생겼어요. 잠시 후 다시 시도해 주세요.", "GEMINI_CONFIG"));
            }
            case FORMAT -> {
                log.error("Gemini 호출 실패 kind=FORMAT reason={}", e.getMessage());
                yield ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new GeminiErrorResponse(
                        "문제가 생겼어요. 잠시 후 다시 시도해 주세요.", "GEMINI_FORMAT"));
            }
        };
    }
}
