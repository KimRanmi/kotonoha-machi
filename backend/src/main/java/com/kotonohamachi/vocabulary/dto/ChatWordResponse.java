package com.kotonohamachi.vocabulary.dto;

/**
 * 대화 중 단어 저장 결과.
 *
 * @param alreadySaved 이미 단어장에 있어서 새로 저장하지 않았으면 true
 * @param entry 저장된(또는 이미 있던) 단어
 */
public record ChatWordResponse(boolean alreadySaved, VocabularyResponse entry) {}
