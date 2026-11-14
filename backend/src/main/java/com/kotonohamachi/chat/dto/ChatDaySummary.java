package com.kotonohamachi.chat.dto;

/**
 * 하루 동안 나눈 대화의 목록용 요약.
 *
 * @param date 대화한 날짜(한국 시간, yyyy-MM-dd)
 * @param lineCount 그날 나눈 줄 수
 * @param preview 그날 플레이어가 처음 한 말(목록의 미리보기)
 */
public record ChatDaySummary(String date, long lineCount, String preview) {}
