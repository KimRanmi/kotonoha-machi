package com.kotonohamachi.vocabulary.dto;

import com.kotonohamachi.vocabulary.VocabularyEntry;
import java.util.List;
import org.springframework.data.domain.Page;

/**
 * 단어장 한 페이지 분량의 응답.
 *
 * @param items 이 페이지의 단어들
 * @param page 현재 페이지 번호(0부터 시작)
 * @param totalPages 전체 페이지 수
 * @param totalElements 조건에 맞는 전체 단어 수
 */
public record VocabularyPageResponse(
    List<VocabularyResponse> items, int page, int totalPages, long totalElements) {

  /**
   * 조회한 페이지를 응답으로 바꾼다.
   *
   * @param entries 단어장 항목 페이지
   * @return 응답 객체
   */
  public static VocabularyPageResponse from(Page<VocabularyEntry> entries) {
    return new VocabularyPageResponse(
        entries.getContent().stream().map(VocabularyResponse::from).toList(),
        entries.getNumber(),
        entries.getTotalPages(),
        entries.getTotalElements());
  }
}
