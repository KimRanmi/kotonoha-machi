package com.kotonohamachi.theme.dto;

/**
 * 한자(KANJI) 단계 콘텐츠 화면에 쓰이는 한자 하나의 정보.
 *
 * @param kanji 한자 글자
 * @param onReading 음독
 * @param kunReading 훈독
 * @param meaning 한글 뜻
 * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1)
 */
public record ThemeKanjiItemResponse(
    String kanji, String onReading, String kunReading, String meaning, int jlptLevel) {}
