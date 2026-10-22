package com.kotonohamachi.theme.dto;

import com.kotonohamachi.theme.ThemeStage;

/**
 * 테마 목록 화면에 쓰이는 테마 하나의 정보. 로그인한 사용자가 아직 시작하지 않은 테마는 {@code currentStage}가
 * {@link ThemeStage#KANJI}, {@code completed}가 false로 내려온다.
 *
 * @param id 테마 ID
 * @param title 테마 제목
 * @param currentStage 지금 진행해야 할 단계
 * @param completed 테마를 끝까지 완료했는지 여부
 */
public record ThemeResponse(Long id, String title, ThemeStage currentStage, boolean completed) {}
