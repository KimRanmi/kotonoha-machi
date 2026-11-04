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
   * 테마의 한 단계에 나오는 항목들을 조회한다. {@link ThemeStage#KANJI}는 한자 글자가 문제, {@link
   * ThemeStage#WORD}·{@link ThemeStage#EXPRESSION}은 단어·표현 표기가 문제, {@link ThemeStage#EXAMPLE}은
   * 예문 문장이, {@link ThemeStage#READING}은 지문 문장이 문제이고, 정답은 각각의 뜻·번역인 객관식이다.
   * {@link ThemeStage#REVIEW}는 객관식이 아니라, 이 테마에서 배운 한자·단어·표현·예문을 전부 모아 소리 내어
   * 따라 읽는 말하기 연습 목록이다.
   *
   * @param themeId 조회할 테마 ID
   * @param stage 조회할 단계
   * @return 단계에 맞는 콘텐츠 목록
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
      case REVIEW -> toReviewItems(themeId);
    };
  }

  private List<ThemeQuizItemResponse> toKanjiQuizItems(List<ThemeKanji> kanjiList) {
    List<String> answerPool =
        themeKanjiRepository.findAll().stream().map(ThemeKanji::getMeaning).toList();
    return kanjiList.stream()
        .map(kanji -> toQuizItem(
            kanji.getKanji(),
            kanji.getMeaning(),
            answerPool,
            firstReading(kanji.getOnReading()),
            kanji.getJlptLevel()))
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
            vocabulary.getReading(),
            vocabulary.getJlptLevel()))
        .toList();
  }

  /**
   * REVIEW 단계의 말하기 연습 목록을 만든다. 이 테마의 한자 → 단어 → 표현 → 예문을 그 순서 그대로 모아, 각 항목의
   * 일본어 표기 자체를 소리 내어 읽는 항목으로 바꾼다.
   */
  private List<ThemeQuizItemResponse> toReviewItems(Long themeId) {
    List<ThemeQuizItemResponse> items = new ArrayList<>();
    themeKanjiRepository.findAllByThemeIdOrderByDisplayOrder(themeId).stream()
        .map(kanji -> toReadAloudItem(
            kanji.getKanji(), firstReading(kanji.getOnReading()), kanji.getJlptLevel()))
        .forEach(items::add);
    themeVocabularyRepository
        .findAllByThemeIdAndStageOrderByDisplayOrder(themeId, ThemeStage.WORD)
        .stream()
        .map(vocabulary -> toReadAloudItem(
            vocabulary.getSurfaceForm(), vocabulary.getReading(), vocabulary.getJlptLevel()))
        .forEach(items::add);
    themeVocabularyRepository
        .findAllByThemeIdAndStageOrderByDisplayOrder(themeId, ThemeStage.EXPRESSION)
        .stream()
        .map(vocabulary -> toReadAloudItem(
            vocabulary.getSurfaceForm(), vocabulary.getReading(), vocabulary.getJlptLevel()))
        .forEach(items::add);
    themeExampleRepository.findAllByThemeIdOrderByDisplayOrder(themeId).stream()
        .map(example -> toReadAloudItem(example.getJapaneseSentence(), example.getReading(), null))
        .forEach(items::add);
    return items;
  }

  /**
   * 말하기 연습 항목 하나를 만든다. 선택지가 없고, 정답은 읽어야 할 문구 자신이다. {@code reading}은
   * 음성 인식 결과가 한자 표기 대신 가나로 나왔을 때도 맞혀진 걸로 볼 수 있도록 프런트엔드가 표기와
   * 함께 비교하는 보조 기준이다.
   */
  private ThemeQuizItemResponse toReadAloudItem(String text, String reading, Integer jlptLevel) {
    return new ThemeQuizItemResponse(text, List.of(), text, reading, jlptLevel);
  }

  /** 쉼표로 구분된 여러 읽는 법({@link ThemeKanji#getOnReading()} 등) 중 첫 번째만 가져온다. */
  private String firstReading(String commaSeparatedReadings) {
    return commaSeparatedReadings.split(",")[0].trim();
  }

  private List<ThemeQuizItemResponse> toExampleQuizItems(List<ThemeExample> exampleList) {
    List<String> answerPool = themeExampleRepository.findAll().stream()
        .map(ThemeExample::getTranslation)
        .toList();
    return exampleList.stream()
        .map(example -> toQuizItem(
            example.getJapaneseSentence(),
            example.getTranslation(),
            answerPool,
            example.getReading(),
            null))
        .toList();
  }

  private List<ThemeQuizItemResponse> toReadingQuizItems(List<ThemeReadingPassage> passages) {
    List<String> answerPool = themeReadingPassageRepository.findAll().stream()
        .map(ThemeReadingPassage::getTranslation)
        .toList();
    return passages.stream()
        .map(passage -> toQuizItem(
            passage.getPassage(),
            passage.getTranslation(),
            answerPool,
            null,
            passage.getJlptLevel()))
        .toList();
  }

  /**
   * 문제 하나를 만든다. 정답 보기 풀({@code answerPool})에서 이 항목의 정답과 다른 값을 최대 {@value
   * #MAX_OPTIONS}-1개 무작위로 골라 오답으로 섞는다. 풀에 다른 값이 부족하면 보기가 그만큼 적게 나온다.
   */
  private ThemeQuizItemResponse toQuizItem(
      String prompt,
      String correctAnswer,
      List<String> answerPool,
      String reading,
      Integer jlptLevel) {
    List<String> distractors = answerPool.stream()
        .filter(candidate -> !candidate.equals(correctAnswer))
        .distinct()
        .collect(Collectors.toCollection(ArrayList::new));
    Collections.shuffle(distractors, ThreadLocalRandom.current());

    List<String> options = new ArrayList<>();
    options.add(correctAnswer);
    options.addAll(distractors.subList(0, Math.min(MAX_OPTIONS - 1, distractors.size())));
    Collections.shuffle(options, ThreadLocalRandom.current());

    return new ThemeQuizItemResponse(prompt, options, correctAnswer, reading, jlptLevel);
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
