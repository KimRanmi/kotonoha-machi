package com.kotonohamachi.vocabulary.repository;

import com.kotonohamachi.vocabulary.VocabularyEntry;
import org.springframework.data.jpa.repository.JpaRepository;

/** 사용자별 단어장 데이터에 접근한다. */
public interface VocabularyRepository extends JpaRepository<VocabularyEntry, Long> {

  /**
   * 사용자의 단어장에 같은 표기+읽는 법의 단어가 이미 있는지 확인한다.
   *
   * @param userId 단어장 주인 ID
   * @param surfaceForm 단어 표기
   * @param reading 읽는 법
   * @return 이미 저장되어 있으면 true
   */
  boolean existsByUserIdAndSurfaceFormAndReading(Long userId, String surfaceForm, String reading);
}
