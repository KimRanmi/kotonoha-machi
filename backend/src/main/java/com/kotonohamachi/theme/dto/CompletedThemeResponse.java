package com.kotonohamachi.theme.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 완료한 학습 목록 화면에 쓰이는 완료한 테마 하나의 정보.
 *
 * @param id 테마 ID
 * @param completedAt 테마를 완료한 시각
 * @param levels 테마의 한자·단어·표현에 나오는 JLPT 레벨 목록(5=N5 ~ 1=N1, 쉬운 레벨부터, 중복 없음)
 */
public record CompletedThemeResponse(Long id, OffsetDateTime completedAt, List<Integer> levels) {}
