package com.kotonohamachi.vocabulary.dto;

/**
 * 사전(JMdict)이 알려준 단어 정보.
 *
 * @param surfaceForm 한자·가나로 쓰인 표기
 * @param reading 히라가나 읽는 법
 * @param englishMeaning 사전의 영어 뜻(여러 개면 쉼표로 이은 문자열)
 * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1, 사전에 없으면 null)
 */
public record DictionaryWord(
    String surfaceForm, String reading, String englishMeaning, Integer jlptLevel) {}
