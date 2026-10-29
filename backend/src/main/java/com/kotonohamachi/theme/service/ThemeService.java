package com.kotonohamachi.theme.service;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.theme.Theme;
import com.kotonohamachi.theme.ThemeErrorCode;
import com.kotonohamachi.theme.ThemeExample;
import com.kotonohamachi.theme.ThemeKanji;
import com.kotonohamachi.theme.ThemeProgress;
import com.kotonohamachi.theme.ThemeReadingPassage;
import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.ThemeVocabulary;
import com.kotonohamachi.theme.dto.ThemeProgressResponse;
import com.kotonohamachi.theme.dto.ThemeQuizItemResponse;
import com.kotonohamachi.theme.dto.ThemeResponse;
import com.kotonohamachi.theme.repository.ThemeExampleRepository;
import com.kotonohamachi.theme.repository.ThemeKanjiRepository;
import com.kotonohamachi.theme.repository.ThemeProgressRepository;
import com.kotonohamachi.theme.repository.ThemeReadingPassageRepository;
import com.kotonohamachi.theme.repository.ThemeRepository;
import com.kotonohamachi.theme.repository.ThemeVocabularyRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 테마 학습의 단계 진행 게이트(한자 → 단어 → 표현 → 예문 → 독해)와 단계별 객관식 문제 생성을 처리한다. 문제는
 * AI가 아니라 DB에 심어둔 실제 데이터로만 만든다 — 정답은 그 항목 자신의 뜻/번역이고, 오답 보기는 같은
 * 단계의 다른 항목들(테마 상관없이 전체) 중에서 무작위로 고른다.
 */
@Service
public class ThemeService {

  private static final int MAX_OPTIONS = 4;
  private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

  private final ThemeRepository themeRepository;
  private final ThemeProgressRepository themeProgressRepository;
  private final ThemeKanjiRepository themeKanjiRepository;
  private final ThemeVocabularyRepository themeVocabularyRepository;
  private final ThemeExampleRepository themeExampleRepository;
  private final ThemeReadingPassageRepository themeReadingPassageRepository;
  private final UserRepository userRepository;

  /**
   * 생성자.
   *
   * @param themeRepository 테마 저장소
   * @param themeProgressRepository 사용자별 테마 진행 상태 저장소
   * @param themeKanjiRepository 테마 한자 콘텐츠 저장소
   * @param themeVocabularyRepository 테마 단어·표현 콘텐츠 저장소
   * @param themeExampleRepository 테마 예문 콘텐츠 저장소
   * @param themeReadingPassageRepository 테마 독해 지문 콘텐츠 저장소
   * @param userRepository 사용자 저장소
   */
  public ThemeService(
      ThemeRepository themeRepository,
      ThemeProgressRepository themeProgressRepository,
      ThemeKanjiRepository themeKanjiRepository,
      ThemeVocabularyRepository themeVocabularyRepository,
      ThemeExampleRepository themeExampleRepository,
      ThemeReadingPassageRepository themeReadingPassageRepository,
      UserRepository userRepository) {
    this.themeRepository = themeRepository;
    this.themeProgressRepository = themeProgressRepository;
    this.themeKanjiRepository = themeKanjiRepository;
    this.themeVocabularyRepository = themeVocabularyRepository;
    this.themeExampleRepository = themeExampleRepository;
    this.themeReadingPassageRepository = themeReadingPassageRepository;
    this.userRepository = userRepository;
  }

  /**
   * 모든 테마를 로그인한 사용자의 진행 상태와 함께 조회한다. 아직 시작하지 않은 테마는 첫 단계({@link
   * ThemeStage#KANJI})로 표시된다. 테마 진행 순서는 자유 선택이라 고정된 순서를 강제하지 않는다.
   *
   * @param userId 조회할 사용자 ID(로그인한 본인)
   * @return 테마 목록과 각 테마의 진행 상태
   */
  @Transactional(readOnly = true)
  public List<ThemeResponse> getThemes(Long userId) {
    List<Theme> themes = themeRepository.findAllByOrderById();
    Map<Long, ThemeProgress> progressByThemeId =
        themeProgressRepository.findAllByUserId(userId).stream()
            .collect(
                Collectors.toMap(progress -> progress.getTheme().getId(), Function.identity()));

    return themes.stream()
        .map(theme -> toThemeResponse(theme, progressByThemeId.get(theme.getId())))
        .toList();
  }

  /**
   * "오늘의 학습" 배너에 추천할 테마를 조회한다. 오늘(한국 시간) 안에 테마를 하나라도 완료했으면 그날은 더 이상
   * 추천하지 않는다(빈 값). 그렇지 않으면 아직 완료하지 않은 테마 중 첫 번째를 추천한다.
   *
   * @param userId 조회할 사용자 ID(로그인한 본인)
   * @return 추천할 테마(오늘 이미 완료했거나 모든 테마를 끝냈으면 빈 값)
   */
  @Transactional(readOnly = true)
  public Optional<ThemeResponse> getTodayRecommendedTheme(Long userId) {
    List<ThemeProgress> progressList = themeProgressRepository.findAllByUserId(userId);
    boolean completedToday = progressList.stream()
        .anyMatch(progress -> progress.isCompleted() && isToday(progress.getUpdatedAt()));
    if (completedToday) {
      return Optional.empty();
    }

    Map<Long, ThemeProgress> progressByThemeId = progressList.stream()
        .collect(Collectors.toMap(progress -> progress.getTheme().getId(), Function.identity()));
    return themeRepository.findAllByOrderById().stream()
        .map(theme -> toThemeResponse(theme, progressByThemeId.get(theme.getId())))
        .filter(response -> !response.completed())
        .findFirst();
  }

  private boolean isToday(OffsetDateTime dateTime) {
    return dateTime.atZoneSameInstant(KOREA_ZONE).toLocalDate().equals(LocalDate.now(KOREA_ZONE));
  }

  /**
   * 테마의 한 단계를 완료 처리하고 다음 단계로 진행한다. 지금 진행해야 할 단계가 아닌 단계를 요청하면(건너뛰기나 이미 끝난
   * 단계 재요청) 거부한다. 아직 시작하지 않은 테마라면 이 호출로 진행 상태를 새로 만든다.
   *
   * @param userId 진행할 사용자 ID(로그인한 본인)
   * @param themeId 진행할 테마 ID
   * @param stage 완료하려는 단계
   * @return 완료 처리 후의 진행 상태
   */
  @Transactional
  public ThemeProgressResponse completeStage(Long userId, Long themeId, ThemeStage stage) {
    Theme theme = findThemeOrThrow(themeId);
    ThemeProgress progress = themeProgressRepository
        .findByUserIdAndThemeId(userId, themeId)
        .orElseGet(
            () -> themeProgressRepository.save(new ThemeProgress(findUserOrThrow(userId), theme)));

    if (!progress.canComplete(stage)) {
      throw new ApiException(ThemeErrorCode.STAGE_OUT_OF_ORDER);
    }
    progress.completeCurrentStage();

    return new ThemeProgressResponse(themeId, progress.getCurrentStage(), progress.isCompleted());
  }

  /**
   * 테마의 한 단계에 나오는 항목들을 객관식 문제로 만들어 조회한다. {@link ThemeStage#KANJI}는 한자
   * 글자가 문제, {@link ThemeStage#WORD}·{@link ThemeStage#EXPRESSION}은 단어·표현 표기가 문제,
   * {@link ThemeStage#EXAMPLE}은 예문 문장이, {@link ThemeStage#READING}은 지문 문장이 문제이고, 정답은
   * 각각의 뜻·번역이다.
   *
   * @param themeId 조회할 테마 ID
   * @param stage 조회할 단계
   * @return 단계에 맞는 객관식 문제 목록
   */
  @Transactional(readOnly = true)
  public List<ThemeQuizItemResponse> getStageContent(Long themeId, ThemeStage stage) {
    findThemeOrThrow(themeId);

    return switch (stage) {
      case KANJI ->
        toKanjiQuizItems(themeKanjiRepository.findAllByThemeIdOrderByDisplayOrder(themeId));
      case WORD, EXPRESSION ->
        toVocabularyQuizItems(
            themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(themeId, stage),
            stage);
      case EXAMPLE ->
        toExampleQuizItems(themeExampleRepository.findAllByThemeIdOrderByDisplayOrder(themeId));
      case READING ->
        toReadingQuizItems(
            themeReadingPassageRepository.findAllByThemeIdOrderByDisplayOrder(themeId));
    };
  }

  private List<ThemeQuizItemResponse> toKanjiQuizItems(List<ThemeKanji> kanjiList) {
    List<String> answerPool =
        themeKanjiRepository.findAll().stream().map(ThemeKanji::getMeaning).toList();
    return kanjiList.stream()
        .map(kanji ->
            toQuizItem(kanji.getKanji(), kanji.getMeaning(), answerPool, kanji.getJlptLevel()))
        .toList();
  }

  private List<ThemeQuizItemResponse> toVocabularyQuizItems(
      List<ThemeVocabulary> vocabularyList, ThemeStage stage) {
    List<String> answerPool = themeVocabularyRepository.findAllByStage(stage).stream()
        .map(ThemeVocabulary::getMeaning)
        .toList();
    return vocabularyList.stream()
        .map(vocabulary -> toQuizItem(
            vocabulary.getSurfaceForm(),
            vocabulary.getMeaning(),
            answerPool,
            vocabulary.getJlptLevel()))
        .toList();
  }

  private List<ThemeQuizItemResponse> toExampleQuizItems(List<ThemeExample> exampleList) {
    List<String> answerPool = themeExampleRepository.findAll().stream()
        .map(ThemeExample::getTranslation)
        .toList();
    return exampleList.stream()
        .map(example ->
            toQuizItem(example.getJapaneseSentence(), example.getTranslation(), answerPool, null))
        .toList();
  }

  private List<ThemeQuizItemResponse> toReadingQuizItems(List<ThemeReadingPassage> passages) {
    List<String> answerPool = themeReadingPassageRepository.findAll().stream()
        .map(ThemeReadingPassage::getTranslation)
        .toList();
    return passages.stream()
        .map(passage -> toQuizItem(
            passage.getPassage(), passage.getTranslation(), answerPool, passage.getJlptLevel()))
        .toList();
  }

  /**
   * 문제 하나를 만든다. 정답 보기 풀({@code answerPool})에서 이 항목의 정답과 다른 값을 최대 {@value
   * #MAX_OPTIONS}-1개 무작위로 골라 오답으로 섞는다. 풀에 다른 값이 부족하면 보기가 그만큼 적게 나온다.
   */
  private ThemeQuizItemResponse toQuizItem(
      String prompt, String correctAnswer, List<String> answerPool, Integer jlptLevel) {
    List<String> distractors = answerPool.stream()
        .filter(candidate -> !candidate.equals(correctAnswer))
        .distinct()
        .collect(Collectors.toCollection(ArrayList::new));
    Collections.shuffle(distractors, ThreadLocalRandom.current());

    List<String> options = new ArrayList<>();
    options.add(correctAnswer);
    options.addAll(distractors.subList(0, Math.min(MAX_OPTIONS - 1, distractors.size())));
    Collections.shuffle(options, ThreadLocalRandom.current());

    return new ThemeQuizItemResponse(prompt, options, correctAnswer, jlptLevel);
  }

  private Theme findThemeOrThrow(Long themeId) {
    return themeRepository
        .findById(themeId)
        .orElseThrow(() -> new ApiException(ThemeErrorCode.THEME_NOT_FOUND));
  }

  private User findUserOrThrow(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new IllegalStateException("로그인한 사용자를 찾을 수 없습니다."));
  }

  private ThemeResponse toThemeResponse(Theme theme, ThemeProgress progress) {
    ThemeStage currentStage = progress != null ? progress.getCurrentStage() : ThemeStage.KANJI;
    boolean completed = progress != null && progress.isCompleted();
    return new ThemeResponse(theme.getId(), theme.getTitle(), currentStage, completed);
  }
}
