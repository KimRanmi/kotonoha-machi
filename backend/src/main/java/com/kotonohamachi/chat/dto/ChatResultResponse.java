package com.kotonohamachi.chat.dto;

/**
 * 대화 한 번의 결과: 주민의 대답과 바뀐 친밀도.
 *
 * @param reply 주민의 일본어 대사
 * @param translation reply의 한국어 번역
 * @param friendshipLevel 대화 뒤의 친밀도(0~100)
 * @param friendshipGain 이번 대화로 오른 친밀도(하루 한도에 막히면 0)
 */
public record ChatResultResponse(
    String reply, String translation, int friendshipLevel, int friendshipGain) {}
