package com.kotonohamachi.vocabulary.repository;

import com.kotonohamachi.vocabulary.VocabularyEntry;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 사용자별 단어장 데이터에 접근한다. */
public interface VocabularyRepository extends JpaRepository<VocabularyEntry, Long> {

  /**
   * 사용자의 단어장에서 주어진 표기들에 해당하는 항목을 한 번에 조회한다. 저장하기 전에 이미 있는 단어를 가려내는 데 쓴다.
   *
   * @param userId 단어장 주인 ID
   * @param surfaceForms 확인할 단어 표기들
   * @return 이미 저장된 항목(표기가 같으면 읽는 법이 다른 항목도 포함)
   */
  List<VocabularyEntry> findAllByUserIdAndSurfaceFormIn(
      Long userId, Collection<String> surfaceForms);

  /**
   * 사용자의 단어장 전체를 최근 저장한 순서로 조회한다.
   *
   * @param userId 단어장 주인 ID
   * @return 최근 저장 순으로 정렬된 단어장 목록
   */
  List<VocabularyEntry> findAllByUserIdOrderBySavedAtDescIdDesc(Long userId);
}
