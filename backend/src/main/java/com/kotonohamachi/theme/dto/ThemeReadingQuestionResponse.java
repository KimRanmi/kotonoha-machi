package com.kotonohamachi.theme.dto;

import java.util.List;

/**
 * 독해 이해 문제 하나. 다른 단계의 객관식 항목({@link ThemeQuizItemResponse})과 같은 모양에 정답 해설이 더해진
 * 것이다. 프런트의 정답 확인·힌트 규칙을 그대로 쓴다.
 *
 * @param prompt 질문
 * @param options 보기(저장된 순서 그대로)
 * @param correctAnswer 정답 보기
 * @param reading 항상 null(독해 문제는 읽는 법 데이터가 없다)
 * @param jlptLevel 지문의 JLPT 레벨
 * @param meaning 항상 null
 * @param explanation 정답 해설(왜 그 보기가 정답인지)
 */
public record ThemeReadingQuestionResponse(
    String prompt,
    List<String> options,
    String correctAnswer,
    String reading,
    Integer jlptLevel,
    String meaning,
    String explanation) {}
