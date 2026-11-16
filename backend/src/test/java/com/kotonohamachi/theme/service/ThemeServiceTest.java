package com.kotonohamachi.theme.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.theme.Theme;
import com.kotonohamachi.theme.ThemeExample;
import com.kotonohamachi.theme.ThemeKanji;
import com.kotonohamachi.theme.ThemeProgress;
import com.kotonohamachi.theme.ThemeReadingPassage;
import com.kotonohamachi.theme.ThemeReadingQuestion;
import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.ThemeVocabulary;
import com.kotonohamachi.theme.dto.ThemeProgressResponse;
import com.kotonohamachi.theme.dto.ThemeQuizItemResponse;
import com.kotonohamachi.theme.dto.ThemeReadingResponse;
import com.kotonohamachi.theme.dto.ThemeResponse;
import com.kotonohamachi.theme.repository.ThemeExampleRepository;
import com.kotonohamachi.theme.repository.ThemeKanjiRepository;
import com.kotonohamachi.theme.repository.ThemeProgressRepository;
import com.kotonohamachi.theme.repository.ThemeReadingPassageRepository;
import com.kotonohamachi.theme.repository.ThemeReadingQuestionRepository;
import com.kotonohamachi.theme.repository.ThemeRepository;
import com.kotonohamachi.theme.repository.ThemeVocabularyRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import com.kotonohamachi.vocabulary.service.VocabularyService;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

/** {@link ThemeService}의 테마 조회와 단계 완료(게이트) 규칙을 Mockito로 의존성을 대체해 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class ThemeServiceTest {

  @Mock
  private ThemeRepository themeRepository;

  @Mock
  private ThemeProgressRepository themeProgressRepository;

  @Mock
  private ThemeKanjiRepository themeKanjiRepository;

  @Mock
  private ThemeVocabularyRepository themeVocabularyRepository;

  @Mock
  private ThemeExampleRepository themeExampleRepository;

  @Mock
  private ThemeReadingPassageRepository themeReadingPassageRepository;

  @Mock
  private ThemeReadingQuestionRepository themeReadingQuestionRepository;

  @Mock
  private UserRepository userRepository;

  @Mock
  private VocabularyService vocabularyService;

  private ThemeService themeService;

  @BeforeEach
  void setUp() {
    themeService = new ThemeService(
        themeRepository,
        themeProgressRepository,
        themeKanjiRepository,
        themeVocabularyRepository,
        themeExampleRepository,
        themeReadingPassageRepository,
        themeReadingQuestionRepository,
        userRepository,
        vocabularyService);
  }

  private static User user() {
    return new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
  }

  @Test
  void getThemes_진행하지_않은_테마는_KANJI_단계와_미완료_상태로_내려온다() {
    Theme theme = new Theme("카페에서 주문하기");
    when(themeRepository.findAllByOrderById()).thenReturn(List.of(theme));
    when(themeProgressRepository.findAllByUserId(1L)).thenReturn(List.of());

    List<ThemeResponse> responses = themeService.getThemes(1L);

    assertThat(responses).hasSize(1);
    assertThat(responses.get(0).currentStage()).isEqualTo(ThemeStage.KANJI);
    assertThat(responses.get(0).completed()).isFalse();
  }

  @Test
  void completeStage_진행중인_단계와_같으면_다음_단계로_넘어간다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeProgress progress = new ThemeProgress(user(), theme);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.of(progress));

    ThemeProgressResponse response = themeService.completeStage(1L, 1L, ThemeStage.KANJI);

    assertThat(response.currentStage()).isEqualTo(ThemeStage.WORD);
    assertThat(response.completed()).isFalse();
  }

  @Test
  void completeStage_READING을_완료하면_REVIEW_단계로_넘어간다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeProgress progress = new ThemeProgress(user(), theme);
    progress.completeCurrentStage(); // KANJI -> WORD
    progress.completeCurrentStage(); // WORD -> EXPRESSION
    progress.completeCurrentStage(); // EXPRESSION -> EXAMPLE
    progress.completeCurrentStage(); // EXAMPLE -> READING
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.of(progress));

    ThemeProgressResponse response = themeService.completeStage(1L, 1L, ThemeStage.READING);

    assertThat(response.currentStage()).isEqualTo(ThemeStage.REVIEW);
    assertThat(response.completed()).isFalse();
  }

  @Test
  void completeStage_마지막_단계인_REVIEW까지_끝내면_테마가_완료된다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeProgress progress = new ThemeProgress(user(), theme);
    progress.completeCurrentStage(); // KANJI -> WORD
    progress.completeCurrentStage(); // WORD -> EXPRESSION
    progress.completeCurrentStage(); // EXPRESSION -> EXAMPLE
    progress.completeCurrentStage(); // EXAMPLE -> READING
    progress.completeCurrentStage(); // READING -> REVIEW
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.of(progress));

    ThemeProgressResponse response = themeService.completeStage(1L, 1L, ThemeStage.REVIEW);

    assertThat(response.completed()).isTrue();
  }

  @Test
  void completeStage_WORD_단계를_완료하면_단어장_저장을_요청한다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeProgress progress = new ThemeProgress(user(), theme);
    progress.completeCurrentStage(); // KANJI -> WORD
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.of(progress));

    themeService.completeStage(1L, 1L, ThemeStage.WORD);

    verify(vocabularyService).saveThemeWords(1L, 1L, ThemeStage.WORD);
  }

  @Test
  void completeStage_단계_순서를_어기면_단어장_저장을_요청하지_않는다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeProgress progress = new ThemeProgress(user(), theme);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.of(progress));

    catchThrowableOfType(
        ApiException.class, () -> themeService.completeStage(1L, 1L, ThemeStage.WORD));

    verify(vocabularyService, never()).saveThemeWords(any(), any(), any());
  }

  @Test
  void completeStage_진행중인_단계를_건너뛰면_409_예외를_던진다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeProgress progress = new ThemeProgress(user(), theme);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.of(progress));

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> themeService.completeStage(1L, 1L, ThemeStage.WORD));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
  }

  @Test
  void completeStage_아직_시작하지_않은_테마는_진행_상태를_새로_만들어_첫_단계부터_확인한다() {
    Theme theme = new Theme("카페에서 주문하기");
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.empty());
    when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
    when(themeProgressRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

    ThemeProgressResponse response = themeService.completeStage(1L, 1L, ThemeStage.KANJI);

    assertThat(response.currentStage()).isEqualTo(ThemeStage.WORD);
  }

  private static ThemeProgress completedProgress(Long themeId, OffsetDateTime completedAt) {
    Theme theme = new Theme("완료한 테마");
    ReflectionTestUtils.setField(theme, "id", themeId);
    ThemeProgress progress = new ThemeProgress(user(), theme);
    for (int i = 0; i < ThemeStage.values().length; i++) {
      progress.completeCurrentStage();
    }
    ReflectionTestUtils.setField(progress, "updatedAt", completedAt);
    return progress;
  }

  @Test
  void completeStage_오늘_다른_테마를_이미_완료했으면_409_예외를_던지고_진행하지_않는다() {
    Theme theme = new Theme("카페에서 주문하기");
    ReflectionTestUtils.setField(theme, "id", 2L);
    ThemeProgress doneToday = completedProgress(1L, OffsetDateTime.now());
    when(themeRepository.findById(2L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findAllByUserId(1L)).thenReturn(List.of(doneToday));

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> themeService.completeStage(1L, 2L, ThemeStage.KANJI));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(exception.getMessage()).contains("오늘은 이미 학습을 완료");
    verify(themeProgressRepository, never()).save(any());
  }

  @Test
  void completeStage_오늘의_테마가_아닌_테마는_409_예외를_던지고_진행하지_않는다() {
    Theme first = new Theme("첫 번째 테마");
    ReflectionTestUtils.setField(first, "id", 1L);
    Theme second = new Theme("두 번째 테마");
    ReflectionTestUtils.setField(second, "id", 2L);
    when(themeRepository.findById(2L)).thenReturn(Optional.of(second));
    when(themeRepository.findAllByOrderById()).thenReturn(List.of(first, second));
    when(themeProgressRepository.findAllByUserId(1L)).thenReturn(List.of());

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> themeService.completeStage(1L, 2L, ThemeStage.KANJI));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
    assertThat(exception.getMessage()).contains("오늘의 학습이 아닙니다");
    verify(themeProgressRepository, never()).save(any());
  }

  @Test
  void completeStage_다른_테마를_어제_완료했으면_오늘_진행할_수_있다() {
    Theme theme = new Theme("카페에서 주문하기");
    ReflectionTestUtils.setField(theme, "id", 2L);
    ThemeProgress progress = new ThemeProgress(user(), theme);
    when(themeRepository.findById(2L)).thenReturn(Optional.of(theme));
    Theme first = completedProgress(1L, OffsetDateTime.now().minusDays(1)).getTheme();
    when(themeRepository.findAllByOrderById()).thenReturn(List.of(first, theme));
    when(themeProgressRepository.findAllByUserId(1L))
        .thenReturn(List.of(completedProgress(1L, OffsetDateTime.now().minusDays(1))));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 2L)).thenReturn(Optional.of(progress));

    ThemeProgressResponse response = themeService.completeStage(1L, 2L, ThemeStage.KANJI);

    assertThat(response.currentStage()).isEqualTo(ThemeStage.WORD);
  }

  @Test
  void completeStage_존재하지_않는_테마면_404_예외를_던진다() {
    when(themeRepository.findById(1L)).thenReturn(Optional.empty());

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> themeService.completeStage(1L, 1L, ThemeStage.KANJI));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void getStageContent_KANJI_단계는_정답을_포함한_보기_목록을_반환한다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeKanji target = new ThemeKanji(theme, "混", "コン", "ま.じる", "혼잡", 2, 1);
    ThemeKanji other = new ThemeKanji(theme, "雑", "ザツ", "まじ.る", "뒤섞임", 2, 2);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeKanjiRepository.findAllByThemeIdOrderByDisplayOrder(1L)).thenReturn(List.of(target));
    when(themeKanjiRepository.findAll()).thenReturn(List.of(target, other));

    List<ThemeQuizItemResponse> content = themeService.getStageContent(1L, ThemeStage.KANJI);

    assertThat(content).hasSize(1);
    ThemeQuizItemResponse item = content.get(0);
    assertThat(item.prompt()).isEqualTo("混");
    assertThat(item.correctAnswer()).isEqualTo("혼잡");
    assertThat(item.options()).contains("혼잡", "뒤섞임");
    assertThat(item.jlptLevel()).isEqualTo(2);
  }

  @Test
  void getStageContent_WORD_단계는_오답_보기가_부족하면_정답만_반환한다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeVocabulary target = new ThemeVocabulary(theme, ThemeStage.WORD, "注文", "ちゅうもん", "주문", 4, 1);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(List.of(target));
    when(themeVocabularyRepository.findAllByStage(ThemeStage.WORD)).thenReturn(List.of(target));

    List<ThemeQuizItemResponse> content = themeService.getStageContent(1L, ThemeStage.WORD);

    assertThat(content).hasSize(1);
    ThemeQuizItemResponse item = content.get(0);
    assertThat(item.prompt()).isEqualTo("注文");
    assertThat(item.correctAnswer()).isEqualTo("주문");
    assertThat(item.options()).containsExactly("주문");
    assertThat(item.jlptLevel()).isEqualTo(4);
  }

  @Test
  void getStageContent_EXAMPLE_단계는_번역을_정답으로_한_보기_목록을_반환한다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeExample target =
        new ThemeExample(theme, "彼女は紅茶を注文した。", "그녀는 차 한 잔을 주문했다.", "かのじょはこうちゃをちゅうもんした。", 1);
    ThemeExample other = new ThemeExample(theme, "道に迷いました。", "길을 잃었습니다.", "みちにまよいました。", 2);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeExampleRepository.findAllByThemeIdOrderByDisplayOrder(1L))
        .thenReturn(List.of(target));
    when(themeExampleRepository.findAll()).thenReturn(List.of(target, other));

    List<ThemeQuizItemResponse> content = themeService.getStageContent(1L, ThemeStage.EXAMPLE);

    assertThat(content).hasSize(1);
    ThemeQuizItemResponse item = content.get(0);
    assertThat(item.prompt()).isEqualTo("彼女は紅茶を注文した。");
    assertThat(item.correctAnswer()).isEqualTo("그녀는 차 한 잔을 주문했다.");
    assertThat(item.options()).contains("그녀는 차 한 잔을 주문했다.", "길을 잃었습니다.");
    assertThat(item.jlptLevel()).isNull();
  }

  @Test
  void getReading_이해_문제가_있는_지문과_출처를_반환한다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeReadingPassage passage = new ThemeReadingPassage(theme, 3, "今日は雨です。", null, 1);
    ThemeReadingQuestion question =
        new ThemeReadingQuestion(passage, "今日の天気は？", List.of("雨", "晴れ", "雪", "曇り"), 1, 1);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeReadingPassageRepository.findAllByThemeIdOrderByDisplayOrder(1L))
        .thenReturn(List.of(passage));
    when(themeReadingQuestionRepository.findAllByPassageIdOrderByDisplayOrder(any()))
        .thenReturn(List.of(question));

    ThemeReadingResponse reading = themeService.getReading(1L).orElseThrow();

    assertThat(reading.passage()).isEqualTo("今日は雨です。");
    assertThat(reading.questions()).hasSize(1);
    assertThat(reading.questions().get(0).prompt()).isEqualTo("今日の天気は？");
    assertThat(reading.questions().get(0).options()).containsExactly("雨", "晴れ", "雪", "曇り");
    assertThat(reading.questions().get(0).correctAnswer()).isEqualTo("雨");
  }

  @Test
  void getReading_이해_문제가_없으면_빈_값을_반환한다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeReadingPassage passage = new ThemeReadingPassage(theme, 3, "今日は雨です。", "번역", 1);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeReadingPassageRepository.findAllByThemeIdOrderByDisplayOrder(1L))
        .thenReturn(List.of(passage));

    assertThat(themeService.getReading(1L)).isEmpty();
  }

  @Test
  void completeStage_이해_문제가_없는_테마는_EXAMPLE_다음_독해를_건너뛰고_REVIEW로_간다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeProgress progress = new ThemeProgress(user(), theme);
    progress.completeCurrentStage(); // KANJI -> WORD
    progress.completeCurrentStage(); // WORD -> EXPRESSION
    progress.completeCurrentStage(); // EXPRESSION -> EXAMPLE
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.of(progress));

    ThemeProgressResponse response = themeService.completeStage(1L, 1L, ThemeStage.EXAMPLE);

    assertThat(response.currentStage()).isEqualTo(ThemeStage.REVIEW);
  }

  @Test
  void completeStage_이해_문제가_있는_테마는_EXAMPLE_다음_READING에서_멈춘다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeProgress progress = new ThemeProgress(user(), theme);
    progress.completeCurrentStage(); // KANJI -> WORD
    progress.completeCurrentStage(); // WORD -> EXPRESSION
    progress.completeCurrentStage(); // EXPRESSION -> EXAMPLE
    ThemeReadingPassage passage = new ThemeReadingPassage(theme, 3, "今日は雨です。", null, 1);
    ThemeReadingQuestion question =
        new ThemeReadingQuestion(passage, "今日の天気は？", List.of("雨", "晴れ", "雪", "曇り"), 1, 1);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.of(progress));
    when(themeReadingPassageRepository.findAllByThemeIdOrderByDisplayOrder(1L))
        .thenReturn(List.of(passage));
    when(themeReadingQuestionRepository.findAllByPassageIdOrderByDisplayOrder(any()))
        .thenReturn(List.of(question));

    ThemeProgressResponse response = themeService.completeStage(1L, 1L, ThemeStage.EXAMPLE);

    assertThat(response.currentStage()).isEqualTo(ThemeStage.READING);
  }

  @Test
  void getStageContent_REVIEW_단계는_한자_단어_표현_예문을_모아_말하기_항목으로_반환한다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeKanji kanji = new ThemeKanji(theme, "混", "コン", "ま.じる", "혼잡", 2, 1);
    ThemeVocabulary word = new ThemeVocabulary(theme, ThemeStage.WORD, "注文", "ちゅうもん", "주문", 4, 1);
    ThemeVocabulary expression =
        new ThemeVocabulary(theme, ThemeStage.EXPRESSION, "いらっしゃいませ", "いらっしゃいませ", "어서 오세요", 4, 1);
    ThemeExample example =
        new ThemeExample(theme, "彼女は紅茶を注文した。", "그녀는 차 한 잔을 주문했다.", "かのじょはこうちゃをちゅうもんした。", 1);
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeKanjiRepository.findAllByThemeIdOrderByDisplayOrder(1L)).thenReturn(List.of(kanji));
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(List.of(word));
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(
            1L, ThemeStage.EXPRESSION))
        .thenReturn(List.of(expression));
    when(themeExampleRepository.findAllByThemeIdOrderByDisplayOrder(1L))
        .thenReturn(List.of(example));

    List<ThemeQuizItemResponse> content = themeService.getStageContent(1L, ThemeStage.REVIEW);

    assertThat(content)
        .extracting(ThemeQuizItemResponse::prompt)
        .containsExactly("混", "注文", "いらっしゃいませ", "彼女は紅茶を注文した。");
    assertThat(content)
        .extracting(ThemeQuizItemResponse::reading)
        .containsExactly("コン", "ちゅうもん", "いらっしゃいませ", "かのじょはこうちゃをちゅうもんした。");
    assertThat(content)
        .extracting(ThemeQuizItemResponse::meaning)
        .containsExactly("혼잡", "주문", "어서 오세요", "그녀는 차 한 잔을 주문했다.");
    assertThat(content)
        .allSatisfy(item -> assertThat(item.correctAnswer()).isEqualTo(item.prompt()));
    assertThat(content).allSatisfy(item -> assertThat(item.options()).isEmpty());
  }

  @Test
  void getStageContent_존재하지_않는_테마면_404_예외를_던진다() {
    when(themeRepository.findById(1L)).thenReturn(Optional.empty());

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> themeService.getStageContent(1L, ThemeStage.KANJI));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
  }
}
