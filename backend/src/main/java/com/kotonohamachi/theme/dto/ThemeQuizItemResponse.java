package com.kotonohamachi.theme.dto;

import java.util.List;

/**
 * 테마 학습 단계 콘텐츠를 보여줄 때 쓰는 항목. {@link com.kotonohamachi.theme.ThemeStage#REVIEW}는 선택지를
 * 고르는 객관식이 아니라 소리 내어 읽는 말하기 연습이라 {@code options}가 항상 빈 목록이고, {@code
 * correctAnswer}는 뜻/번역이 아니라 {@code prompt}와 같은 값(음성 인식 결과와 비교할 기준 문자열)이다.
 *
 * @param prompt 문제로 보여줄 표기(한자 글자, 단어·표현 표기, 예문 문장, 또는 독해 지문)
 * @param options 보기 목록(정답 포함, 뒤섞인 순서). 데이터가 부족하면 4개보다 적을 수 있고, REVIEW는 항상
 *     빈 목록이다.
 * @param correctAnswer 정답 보기(뜻 또는 번역). REVIEW는 예외적으로 {@code prompt}와 같은 값이다.
 * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1). 예문(EXAMPLE) 단계는 레벨 데이터가 없어 null이다.
 */
public record ThemeQuizItemResponse(
    String prompt, List<String> options, String correctAnswer, Integer jlptLevel) {}
