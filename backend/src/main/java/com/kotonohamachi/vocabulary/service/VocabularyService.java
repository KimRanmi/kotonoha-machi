package com.kotonohamachi.vocabulary.service;

import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.ThemeVocabulary;
import com.kotonohamachi.theme.repository.ThemeVocabularyRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import com.kotonohamachi.vocabulary.VocabularyEntry;
import com.kotonohamachi.vocabulary.VocabularySource;
import com.kotonohamachi.vocabulary.dto.VocabularyResponse;
import com.kotonohamachi.vocabulary.repository.VocabularyRepository;
import java.util.List;
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
   * 건너뛰므로 같은 단계를 다시 호출해도 안전하다.
   *
   * @param userId 단어장 주인 ID(로그인한 본인)
   * @param themeId 배운 테마 ID
   * @param stage 완료한 단계
   * @return 이번에 새로 저장한 단어 수
   */
  @Transactional
  public int saveThemeWords(Long userId, Long themeId, ThemeStage stage) {
    if (stage != ThemeStage.WORD && stage != ThemeStage.EXPRESSION) {
      return 0;
    }
    List<ThemeVocabulary> learnedWords =
        themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(themeId, stage);
    User user = findUserOrThrow(userId);

    int savedCount = 0;
    for (ThemeVocabulary word : learnedWords) {
      if (vocabularyRepository.existsByUserIdAndSurfaceFormAndReading(
          userId, word.getSurfaceForm(), word.getReading())) {
        continue;
      }
      vocabularyRepository.save(new VocabularyEntry(
          user,
          word.getSurfaceForm(),
          word.getReading(),
          word.getMeaning(),
          word.getJlptLevel(),
          VocabularySource.THEME));
      savedCount++;
    }
    return savedCount;
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

  private User findUserOrThrow(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new IllegalStateException("로그인한 사용자를 찾을 수 없습니다."));
  }
}
