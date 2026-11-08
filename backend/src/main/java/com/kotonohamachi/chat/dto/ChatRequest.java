package com.kotonohamachi.chat.dto;

/**
 * 주민에게 보내는 대화 요청.
 *
 * @param message 플레이어가 입력한 메시지
 */
public record ChatRequest(String message) {}
