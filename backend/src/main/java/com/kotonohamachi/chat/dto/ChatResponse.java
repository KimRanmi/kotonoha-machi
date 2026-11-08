package com.kotonohamachi.chat.dto;

/**
 * 주민의 대답.
 *
 * @param reply 주민의 일본어 대사
 * @param translation reply의 한국어 번역
 */
public record ChatResponse(String reply, String translation) {}
