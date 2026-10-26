package com.kotonohamachi.theme.dto;

import java.util.List;

/**
 * 테마 학습 단계 콘텐츠를 객관식 문제 하나로 보여줄 때 쓰는 항목.
 *
 * @param prompt 문제로 보여줄 표기(한자 글자, 단어·표현 표기, 예문 문장, 또는 독해 지문)
 * @param options 보기 목록(정답 포함, 뒤섞인 순서). 데이터가 부족하면 4개보다 적을 수 있다.
 * @param correctAnswer 정답 보기(뜻 또는 번역)
 * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1). 예문(EXAMPLE) 단계는 레벨 데이터가 없어 null이다.
 */
public record ThemeQuizItemResponse(
    String prompt, List<String> options, String correctAnswer, Integer jlptLevel) {}
