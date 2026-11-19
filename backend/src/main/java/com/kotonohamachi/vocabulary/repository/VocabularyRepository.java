package com.kotonohamachi.vocabulary.repository;

import com.kotonohamachi.vocabulary.VocabularyEntry;
import com.kotonohamachi.vocabulary.VocabularySource;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
   * 사용자의 단어장에서 같은 표기+읽는 법의 항목을 찾는다.
   *
   * @param userId 단어장 주인 ID
   * @param surfaceForm 단어 표기
   * @param reading 읽는 법
   * @return 이미 저장된 항목(없으면 빈 값)
   */
  Optional<VocabularyEntry> findByUserIdAndSurfaceFormAndReading(
      Long userId, String surfaceForm, String reading);

  /**
   * 사용자의 단어장 한 페이지를 조회한다. 정렬은 pageable로 정한다.
   *
   * @param userId 단어장 주인 ID
   * @param pageable 페이지 번호·크기·정렬
   * @return 단어장 페이지
   */
  Page<VocabularyEntry> findAllByUserId(Long userId, Pageable pageable);

  /**
   * 사용자의 단어장에서 JLPT 레벨이 일치하는 단어의 한 페이지를 조회한다.
   *
   * @param userId 단어장 주인 ID
   * @param jlptLevel JLPT 레벨(3=N3 등)
   * @param pageable 페이지 번호·크기·정렬
   * @return 단어장 페이지
   */
  Page<VocabularyEntry> findAllByUserIdAndJlptLevel(
      Long userId, Integer jlptLevel, Pageable pageable);

  /**
   * 사용자의 단어장에서 N1~N3가 아닌 단어(N4·N5, 레벨 모름)의 한 페이지를 조회한다.
   *
   * @param userId 단어장 주인 ID
   * @param pageable 페이지 번호·크기·정렬
   * @return 단어장 페이지
   */
  @Query("select e from VocabularyEntry e where e.user.id = :userId"
      + " and (e.jlptLevel is null or e.jlptLevel > 3)")
  Page<VocabularyEntry> findOtherLevels(@Param("userId") Long userId, Pageable pageable);

  /**
   * 사용자가 주어진 시각 이후에 특정 경로로 저장한 단어 수를 센다. 대화 단어 저장의 하루 상한 확인에 쓴다.
   *
   * @param userId 단어장 주인 ID
   * @param source 저장 경로
   * @param since 이 시각 이후(포함)
   * @return 저장한 단어 수
   */
  long countByUserIdAndSourceAndSavedAtGreaterThanEqual(
      Long userId, VocabularySource source, OffsetDateTime since);
}
