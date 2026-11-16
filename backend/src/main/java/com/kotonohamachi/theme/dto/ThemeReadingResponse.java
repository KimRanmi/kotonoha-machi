package com.kotonohamachi.theme.dto;

import java.util.List;

/**
 * 독해(READING) 단계 화면에 보여줄 지문과 이해 문제. 문제는 다른 단계와 같은 객관식 항목({@link
 * ThemeQuizItemResponse})에 정답 해설을 더한 {@link ThemeReadingQuestionResponse}라 프런트의 정답 확인·힌트 규칙을 그대로 쓴다: {@code prompt}는 질문, {@code options}는
 * 저장된 보기 순서(섞지 않음), {@code correctAnswer}는 정답 보기다.
 *
 * @param passage 일본어 지문
 * @param sourceTitle 출처 글 제목
 * @param sourceUrl 출처 글 주소
 * @param license 라이선스 표기
 * @param excerpt 글의 일부만 발췌했으면 true
 * @param questions 이해 문제 목록
 */
public record ThemeReadingResponse(
    String passage,
    String sourceTitle,
    String sourceUrl,
    String license,
    boolean excerpt,
    List<ThemeReadingQuestionResponse> questions) {}
