package com.kotonohamachi.vocabulary.dto;

/**
 * 대화 중 고른 단어를 단어장에 저장하라는 요청.
 *
 * @param word 대화에서 드래그해 고른 일본어 표기
 */
public record ChatWordRequest(String word) {}
