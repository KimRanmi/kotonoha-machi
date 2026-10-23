package com.kotonohamachi.theme.dto;

/**
 * 단어(WORD) 또는 표현(EXPRESSION) 단계 콘텐츠 화면에 쓰이는 항목 하나의 정보.
 *
 * @param surfaceForm 한자·가나로 쓰인 표기
 * @param reading 히라가나 읽는 법
 * @param meaning 한글 뜻
 * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1)
 */
public record ThemeVocabularyItemResponse(
    String surfaceForm, String reading, String meaning, int jlptLevel) {}
