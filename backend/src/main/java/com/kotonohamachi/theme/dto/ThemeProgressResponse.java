package com.kotonohamachi.theme.dto;

import com.kotonohamachi.theme.ThemeStage;

/**
 * 단계 완료 요청 처리 후 돌려주는 진행 상태.
 *
 * @param themeId 테마 ID
 * @param currentStage 완료 처리 후 지금 진행해야 할 단계
 * @param completed 테마를 끝까지 완료했는지 여부
 */
public record ThemeProgressResponse(Long themeId, ThemeStage currentStage, boolean completed) {}
