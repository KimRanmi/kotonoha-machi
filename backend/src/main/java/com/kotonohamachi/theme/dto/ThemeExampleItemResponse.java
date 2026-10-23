package com.kotonohamachi.theme.dto;

/**
 * 예문(EXAMPLE) 단계 콘텐츠 화면에 쓰이는 예문 하나의 정보.
 *
 * @param japaneseSentence 일본어 예문
 * @param translation 한글 번역
 */
public record ThemeExampleItemResponse(String japaneseSentence, String translation) {}
