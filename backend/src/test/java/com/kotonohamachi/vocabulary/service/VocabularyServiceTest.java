package com.kotonohamachi.vocabulary.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.theme.Theme;
import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.ThemeVocabulary;
import com.kotonohamachi.theme.repository.ThemeVocabularyRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import com.kotonohamachi.vocabulary.VocabularyEntry;
import com.kotonohamachi.vocabulary.VocabularyErrorCode;
import com.kotonohamachi.vocabulary.VocabularySource;
import com.kotonohamachi.vocabulary.dto.DictionaryWord;
import com.kotonohamachi.vocabulary.repository.VocabularyRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;

/** {@link VocabularyService#saveThemeWords}의 저장 규칙을 Mockito로 의존성을 대체해 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class VocabularyServiceTest {

  @Mock
  private VocabularyRepository vocabularyRepository;

  @Mock
  private ThemeVocabularyRepository themeVocabularyRepository;

  @Mock
  private UserRepository userRepository;

  @Mock
  private DictionaryClient dictionaryClient;

  @Mock
  private MeaningTranslator meaningTranslator;

  @Captor
  private ArgumentCaptor<List<VocabularyEntry>> entriesCaptor;

  @InjectMocks
  private VocabularyService vocabularyService;

  private static User user() {
    return new User("a@test.com", "hash", "nick", "123456", OffsetDateTime.now().plusMinutes(10));
  }

  private static ThemeVocabulary word(ThemeStage stage, String surface, String reading, int order) {
    return new ThemeVocabulary(new Theme("카페"), stage, surface, reading, "뜻-" + surface, 5, order);
  }

  @Test
  void saveThemeWords_WORD_단계의_단어를_THEME_출처로_저장한다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(
            List.of(word(ThemeStage.WORD, "水", "みず", 1), word(ThemeStage.WORD, "茶", "ちゃ", 2)));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user()));

    int saved = vocabularyService.saveThemeWords(1L, 1L, ThemeStage.WORD);

    assertThat(saved).isEqualTo(2);
    verify(vocabularyRepository).saveAll(entriesCaptor.capture());
    List<VocabularyEntry> entries = entriesCaptor.getValue();
    assertThat(entries).hasSize(2);
    VocabularyEntry first = entries.get(0);
    assertThat(first.getSurfaceForm()).isEqualTo("水");
    assertThat(first.getReading()).isEqualTo("みず");
    assertThat(first.getMeaning()).isEqualTo("뜻-水");
    assertThat(first.getJlptLevel()).isEqualTo(5);
    assertThat(first.getSource()).isEqualTo(VocabularySource.THEME);
  }

  @Test
  void saveThemeWords_EXPRESSION_단계도_저장한다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(
            1L, ThemeStage.EXPRESSION))
        .thenReturn(List.of(word(ThemeStage.EXPRESSION, "お願いします", "おねがいします", 1)));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user()));

    int saved = vocabularyService.saveThemeWords(1L, 1L, ThemeStage.EXPRESSION);

    assertThat(saved).isEqualTo(1);
    verify(vocabularyRepository).saveAll(entriesCaptor.capture());
    assertThat(entriesCaptor.getValue()).hasSize(1);
    assertThat(entriesCaptor.getValue().get(0).getSurfaceForm()).isEqualTo("お願いします");
  }

  @Test
  void saveThemeWords_단어_표현이_아닌_단계는_아무것도_저장하지_않는다() {
    for (ThemeStage stage :
        List.of(ThemeStage.KANJI, ThemeStage.EXAMPLE, ThemeStage.READING, ThemeStage.REVIEW)) {
      assertThat(vocabularyService.saveThemeWords(1L, 1L, stage)).isZero();
    }

    verifyNoInteractions(vocabularyRepository, themeVocabularyRepository, userRepository);
  }

  @Test
  void saveThemeWords_이미_단어장에_있는_단어는_건너뛴다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(
            List.of(word(ThemeStage.WORD, "水", "みず", 1), word(ThemeStage.WORD, "茶", "ちゃ", 2)));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
    when(vocabularyRepository.findAllByUserIdAndSurfaceFormIn(eq(1L), anyList()))
        .thenReturn(List.of(existing("水", "みず")));

    int saved = vocabularyService.saveThemeWords(1L, 1L, ThemeStage.WORD);

    assertThat(saved).isEqualTo(1);
    verify(vocabularyRepository).saveAll(entriesCaptor.capture());
    assertThat(entriesCaptor.getValue()).hasSize(1);
    assertThat(entriesCaptor.getValue().get(0).getSurfaceForm()).isEqualTo("茶");
  }

  @Test
  void saveThemeWords_사용자가_없으면_IllegalStateException을_던진다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(List.of(word(ThemeStage.WORD, "水", "みず", 1)));
    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> vocabularyService.saveThemeWords(99L, 1L, ThemeStage.WORD))
        .isInstanceOf(IllegalStateException.class);

    verify(vocabularyRepository, never()).saveAll(any());
  }

  @Test
  void saveThemeWords_이미_있는_단어_조회는_단어_수와_무관하게_한_번만_한다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(List.of(
            word(ThemeStage.WORD, "水", "みず", 1),
            word(ThemeStage.WORD, "茶", "ちゃ", 2),
            word(ThemeStage.WORD, "犬", "いぬ", 3),
            word(ThemeStage.WORD, "猫", "ねこ", 4),
            word(ThemeStage.WORD, "山", "やま", 5)));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user()));

    vocabularyService.saveThemeWords(1L, 1L, ThemeStage.WORD);

    verify(vocabularyRepository, times(1)).findAllByUserIdAndSurfaceFormIn(anyLong(), anyList());
    verify(vocabularyRepository, times(1)).saveAll(anyList());
    verify(vocabularyRepository, never()).save(any());
  }

  @Test
  void saveThemeWords_같은_배치_안의_표기와_읽는_법이_같은_항목은_하나만_저장한다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(
            List.of(word(ThemeStage.WORD, "水", "みず", 1), word(ThemeStage.WORD, "水", "みず", 2)));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user()));

    int saved = vocabularyService.saveThemeWords(1L, 1L, ThemeStage.WORD);

    assertThat(saved).isEqualTo(1);
    verify(vocabularyRepository).saveAll(entriesCaptor.capture());
    assertThat(entriesCaptor.getValue()).hasSize(1);
  }

  @Test
  void saveThemeWords_표기는_같고_읽는_법이_다르면_둘_다_저장한다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(
            List.of(word(ThemeStage.WORD, "日", "ひ", 1), word(ThemeStage.WORD, "日", "にち", 2)));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user()));

    int saved = vocabularyService.saveThemeWords(1L, 1L, ThemeStage.WORD);

    assertThat(saved).isEqualTo(2);
    verify(vocabularyRepository).saveAll(entriesCaptor.capture());
    assertThat(entriesCaptor.getValue())
        .extracting(VocabularyEntry::getReading)
        .containsExactly("ひ", "にち");
  }

  @Test
  void saveThemeWords_저장_중_유니크_위반이_나면_409_ApiException으로_바꿔_던진다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(List.of(word(ThemeStage.WORD, "水", "みず", 1)));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user()));
    when(vocabularyRepository.saveAll(anyList()))
        .thenThrow(new DataIntegrityViolationException("duplicate key"));

    assertThatThrownBy(() -> vocabularyService.saveThemeWords(1L, 1L, ThemeStage.WORD))
        .isInstanceOfSatisfying(ApiException.class, exception -> {
          assertThat(exception.getStatus()).isEqualTo(HttpStatus.CONFLICT);
          assertThat(exception.getMessage())
              .isEqualTo(VocabularyErrorCode.SAVE_CONFLICT.getMessage());
        });
  }

  @Test
  void saveThemeWords_가져온_단어가_없으면_0을_반환하고_조회와_사용자_확인을_하지_않는다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(List.of());

    int saved = vocabularyService.saveThemeWords(1L, 1L, ThemeStage.WORD);

    assertThat(saved).isZero();
    verifyNoInteractions(vocabularyRepository, userRepository);
  }

  @Test
  void normalizeWord_앞뒤_문장부호와_공백을_떼고_중간_공백은_거절한다() {
    assertThat(VocabularyService.normalizeWord(" 「漆器」。 ")).isEqualTo("漆器");
    assertThatThrownBy(() -> VocabularyService.normalizeWord("漆器 です"))
        .isInstanceOf(ApiException.class);
    assertThatThrownBy(() -> VocabularyService.normalizeWord("。。"))
        .isInstanceOf(ApiException.class);
  }

  @Test
  void saveChatWord_하루_상한에_도달하면_번역_없이_429로_거절한다() {
    DictionaryWord found = new DictionaryWord("雪", "ゆき", "snow", null);
    when(dictionaryClient.lookup("雪")).thenReturn(Optional.of(found));
    when(vocabularyRepository.findByUserIdAndSurfaceFormAndReading(1L, "雪", "ゆき"))
        .thenReturn(Optional.empty());
    when(vocabularyRepository.countByUserIdAndSourceAndSavedAtGreaterThanEqual(
            eq(1L), eq(VocabularySource.CHAT), any()))
        .thenReturn((long) VocabularyService.DAILY_CHAT_WORD_LIMIT);

    assertThatThrownBy(() -> vocabularyService.saveChatWord(1L, "雪"))
        .isInstanceOfSatisfying(
            ApiException.class,
            exception -> assertThat(exception.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS));
    verifyNoInteractions(meaningTranslator);
  }

  private static VocabularyEntry existing(String surface, String reading) {
    return new VocabularyEntry(user(), surface, reading, "뜻-" + surface, 5, VocabularySource.THEME);
  }
}
