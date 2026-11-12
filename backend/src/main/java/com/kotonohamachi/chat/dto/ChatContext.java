package com.kotonohamachi.chat.dto;

import java.util.List;

/**
 * AI에게 함께 보낼 지난 대화 맥락.
 *
 * @param summary 오래된 대화의 요약 메모(없으면 빈 문자열)
 * @param recentLines 최근 대화(오래된 것이 먼저)
 */
public record ChatContext(String summary, List<ChatHistoryItem> recentLines) {}
