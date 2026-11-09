package com.kotonohamachi.vocabulary.service;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.ThemeVocabulary;
import com.kotonohamachi.theme.repository.ThemeVocabularyRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import com.kotonohamachi.vocabulary.VocabularyEntry;
import com.kotonohamachi.vocabulary.VocabularyErrorCode;
import com.kotonohamachi.vocabulary.VocabularySource;
import com.kotonohamachi.vocabulary.dto.VocabularyResponse;
import com.kotonohamachi.vocabulary.repository.VocabularyRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자의 학습 단어장에 단어를 저장한다. 뜻·읽는 법·JLPT 레벨은 AI가 만들지 않고 DB에 있는 실제 사전 데이터를
 * 그대로 복사한다. (대화 중 단어 저장은 대화 기능이 구현된 뒤에 추가한다.)
 */
@Service
public class VocabularyService {

  private final VocabularyRepository vocabularyRepository;
  private final ThemeVocabularyRepository themeVocabularyRepository;
  private final UserRepository userRepository;

  /**
   * 생성자.
   *
   * @param vocabularyRepository 단어장 저장소
   * @param themeVocabularyRepository 테마 단어·표현 콘텐츠 저장소
   * @param userRepository 사용자 저장소
   */
  public VocabularyService(
      VocabularyRepository vocabularyRepository,
      ThemeVocabularyRepository themeVocabularyRepository,
      UserRepository userRepository) {
    this.vocabularyRepository = vocabularyRepository;
    this.themeVocabularyRepository = themeVocabularyRepository;
    this.userRepository = userRepository;
  }

  /**
   * 테마 학습의 한 단계에서 배운 단어를 단어장에 저장한다. 단어({@link ThemeStage#WORD})와 표현({@link
   * ThemeStage#EXPRESSION}) 단계만 대상이고, 다른 단계는 아무것도 저장하지 않는다. 이미 단어장에 있는 단어는
   * 건너뛰므로 같은 단계를 다시 호출해도 안전하다. 이미 있는 단어는 단어마다 묻지 않고 한 번에 조회해서 가려낸다.
   *
   * @param userId 단어장 주인 ID(로그인한 본인)
   * @param themeId 배운 테마 ID
   * @param stage 완료한 단계
   * @return 이번에 새로 저장한 단어 수
   * @throws ApiException 같은 단계의 완료가 동시에 처리되어 저장이 겹치면(409). 이 예외로 호출한 쪽의 트랜잭션 전체(단계 완료
   *     포함)가 취소된다.
   */
  @Transactional
  public int saveThemeWords(Long userId, Long themeId, ThemeStage stage) {
    if (stage != ThemeStage.WORD && stage != ThemeStage.EXPRESSION) {
      return 0;
    }
    List<ThemeVocabulary> learnedWords =
        themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(themeId, stage);
    if (learnedWords.isEmpty()) {
      return 0;
    }

    // 이미 저장된 단어와, 이번 배치에서 방금 고른 단어를 한 집합으로 관리해서 중복을 건너뛴다.
    Set<WordKey> knownWords = vocabularyRepository
        .findAllByUserIdAndSurfaceFormIn(
            userId,
            learnedWords.stream()
                .map(ThemeVocabulary::getSurfaceForm)
                .distinct()
                .toList())
        .stream()
        .map(entry -> new WordKey(entry.getSurfaceForm(), entry.getReading()))
        .collect(Collectors.toCollection(HashSet::new));

    User user = findUserOrThrow(userId);
    List<VocabularyEntry> newEntries = new ArrayList<>();
    for (ThemeVocabulary word : learnedWords) {
      if (knownWords.add(new WordKey(word.getSurfaceForm(), word.getReading()))) {
        newEntries.add(new VocabularyEntry(
            user,
            word.getSurfaceForm(),
            word.getReading(),
            word.getMeaning(),
            word.getJlptLevel(),
            VocabularySource.THEME));
      }
    }

    try {
      vocabularyRepository.saveAll(newEntries);
    } catch (DataIntegrityViolationException exception) {
      // 같은 사용자의 같은 단계 완료가 동시에 들어와 둘 다 위의 조회를 통과한 경우, 뒤에 온 요청이 DB 유니크 제약에 걸린다.
      // 이 시점의 DB 트랜잭션은 이미 실패 상태라 여기서 계속 진행할 수 없으므로, ApiException으로 바꿔 던져 전체를 취소한다.
      throw new ApiException(VocabularyErrorCode.SAVE_CONFLICT);
    }
    return newEntries.size();
  }

  /**
   * 사용자의 단어장을 최근 저장한 순서로 조회한다.
   *
   * @param userId 단어장 주인 ID(로그인한 본인)
   * @return 단어장 목록
   */
  @Transactional(readOnly = true)
  public List<VocabularyResponse> getVocabulary(Long userId) {
    return vocabularyRepository.findAllByUserIdOrderBySavedAtDescIdDesc(userId).stream()
        .map(VocabularyResponse::from)
        .toList();
  }

  /** 단어장에서 같은 단어를 가리는 기준: 표기와 읽는 법이 모두 같아야 같은 단어다. */
  private record WordKey(String surfaceForm, String reading) {}

  private User findUserOrThrow(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new IllegalStateException("로그인한 사용자를 찾을 수 없습니다."));
  }
}
