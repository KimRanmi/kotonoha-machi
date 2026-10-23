package com.kotonohamachi.theme.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.theme.Theme;
import com.kotonohamachi.theme.ThemeExample;
import com.kotonohamachi.theme.ThemeKanji;
import com.kotonohamachi.theme.ThemeProgress;
import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.ThemeVocabulary;
import com.kotonohamachi.theme.dto.ThemeExampleItemResponse;
import com.kotonohamachi.theme.dto.ThemeKanjiItemResponse;
import com.kotonohamachi.theme.dto.ThemeProgressResponse;
import com.kotonohamachi.theme.dto.ThemeResponse;
import com.kotonohamachi.theme.dto.ThemeVocabularyItemResponse;
import com.kotonohamachi.theme.repository.ThemeExampleRepository;
import com.kotonohamachi.theme.repository.ThemeKanjiRepository;
import com.kotonohamachi.theme.repository.ThemeProgressRepository;
import com.kotonohamachi.theme.repository.ThemeRepository;
import com.kotonohamachi.theme.repository.ThemeVocabularyRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

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
  private UserRepository userRepository;

  private ThemeService themeService;

  @BeforeEach
  void setUp() {
    themeService = new ThemeService(
        themeRepository,
        themeProgressRepository,
        themeKanjiRepository,
        themeVocabularyRepository,
        themeExampleRepository,
        userRepository);
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
  void completeStage_마지막_단계인_READING까지_끝내면_테마가_완료된다() {
    Theme theme = new Theme("카페에서 주문하기");
    ThemeProgress progress = new ThemeProgress(user(), theme);
    progress.completeCurrentStage(); // KANJI -> WORD
    progress.completeCurrentStage(); // WORD -> EXPRESSION
    progress.completeCurrentStage(); // EXPRESSION -> EXAMPLE
    progress.completeCurrentStage(); // EXAMPLE -> READING
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeProgressRepository.findByUserIdAndThemeId(1L, 1L)).thenReturn(Optional.of(progress));

    ThemeProgressResponse response = themeService.completeStage(1L, 1L, ThemeStage.READING);

    assertThat(response.completed()).isTrue();
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

  @Test
  void completeStage_존재하지_않는_테마면_404_예외를_던진다() {
    when(themeRepository.findById(1L)).thenReturn(Optional.empty());

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> themeService.completeStage(1L, 1L, ThemeStage.KANJI));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void getStageContent_KANJI_단계는_한자_목록을_반환한다() {
    Theme theme = new Theme("카페에서 주문하기");
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeKanjiRepository.findAllByThemeIdOrderByDisplayOrder(1L))
        .thenReturn(List.of(new ThemeKanji(theme, "水", "スイ", "みず", "물", 5, 1)));

    List<?> content = themeService.getStageContent(1L, ThemeStage.KANJI);

    assertThat(content).hasSize(1);
    assertThat(content.get(0)).isEqualTo(new ThemeKanjiItemResponse("水", "スイ", "みず", "물", 5));
  }

  @Test
  void getStageContent_WORD_단계는_단어_목록을_반환한다() {
    Theme theme = new Theme("카페에서 주문하기");
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(
            List.of(new ThemeVocabulary(theme, ThemeStage.WORD, "注文", "ちゅうもん", "주문", 4, 1)));

    List<?> content = themeService.getStageContent(1L, ThemeStage.WORD);

    assertThat(content).hasSize(1);
    assertThat(content.get(0)).isEqualTo(new ThemeVocabularyItemResponse("注文", "ちゅうもん", "주문", 4));
  }

  @Test
  void getStageContent_EXAMPLE_단계는_예문_목록을_반환한다() {
    Theme theme = new Theme("카페에서 주문하기");
    when(themeRepository.findById(1L)).thenReturn(Optional.of(theme));
    when(themeExampleRepository.findAllByThemeIdOrderByDisplayOrder(1L))
        .thenReturn(List.of(new ThemeExample(theme, "彼女は紅茶を注文した。", "그녀는 차 한 잔을 주문했다.", 1)));

    List<?> content = themeService.getStageContent(1L, ThemeStage.EXAMPLE);

    assertThat(content).hasSize(1);
    assertThat(content.get(0))
        .isEqualTo(new ThemeExampleItemResponse("彼女は紅茶を注文した。", "그녀는 차 한 잔을 주문했다."));
  }

  @Test
  void getStageContent_READING_단계는_501_예외를_던진다() {
    when(themeRepository.findById(1L)).thenReturn(Optional.of(new Theme("카페에서 주문하기")));

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> themeService.getStageContent(1L, ThemeStage.READING));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_IMPLEMENTED);
  }

  @Test
  void getStageContent_존재하지_않는_테마면_404_예외를_던진다() {
    when(themeRepository.findById(1L)).thenReturn(Optional.empty());

    ApiException exception = catchThrowableOfType(
        ApiException.class, () -> themeService.getStageContent(1L, ThemeStage.KANJI));

    assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
  }
}
