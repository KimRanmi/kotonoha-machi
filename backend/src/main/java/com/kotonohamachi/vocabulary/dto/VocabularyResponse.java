package com.kotonohamachi.vocabulary.dto;

import com.kotonohamachi.vocabulary.VocabularyEntry;
import com.kotonohamachi.vocabulary.VocabularySource;
import java.time.OffsetDateTime;

/**
 * 단어장에 저장된 단어 하나.
 *
 * @param id 단어장 항목 ID
 * @param surfaceForm 한자·가나로 쓰인 표기
 * @param reading 히라가나 읽는 법
 * @param meaning 한글 뜻
 * @param jlptLevel JLPT 레벨(5=N5 ~ 1=N1, 모르면 null)
 * @param source 단어가 들어온 경로
 * @param savedAt 저장 시각
 */
public record VocabularyResponse(
    Long id,
    String surfaceForm,
    String reading,
    String meaning,
    Integer jlptLevel,
    VocabularySource source,
    OffsetDateTime savedAt) {

  /**
   * 엔티티를 응답으로 바꾼다.
   *
   * @param entry 단어장 항목
   * @return 응답 객체
   */
  public static VocabularyResponse from(VocabularyEntry entry) {
    return new VocabularyResponse(
        entry.getId(),
        entry.getSurfaceForm(),
        entry.getReading(),
        entry.getMeaning(),
        entry.getJlptLevel(),
        entry.getSource(),
        entry.getSavedAt());
  }
}
