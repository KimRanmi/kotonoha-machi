package com.kotonohamachi.common;

/**
 * 오류 응답 본문.
 *
 * @param message 사용자에게 보여줄 오류 메시지
 */
public record ErrorResponse(String message) {}
