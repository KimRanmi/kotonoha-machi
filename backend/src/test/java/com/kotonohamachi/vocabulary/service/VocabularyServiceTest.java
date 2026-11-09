package com.kotonohamachi.vocabulary.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.kotonohamachi.theme.Theme;
import com.kotonohamachi.theme.ThemeStage;
import com.kotonohamachi.theme.ThemeVocabulary;
import com.kotonohamachi.theme.repository.ThemeVocabularyRepository;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.repository.UserRepository;
import com.kotonohamachi.vocabulary.VocabularyEntry;
import com.kotonohamachi.vocabulary.VocabularySource;
import com.kotonohamachi.vocabulary.repository.VocabularyRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** {@link VocabularyService#saveThemeWords}의 저장 규칙을 Mockito로 의존성을 대체해 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class VocabularyServiceTest {

  @Mock
  private VocabularyRepository vocabularyRepository;

  @Mock
  private ThemeVocabularyRepository themeVocabularyRepository;

  @Mock
  private UserRepository userRepository;

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
    User user = user();
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(
            List.of(word(ThemeStage.WORD, "水", "みず", 1), word(ThemeStage.WORD, "茶", "ちゃ", 2)));
    when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    when(vocabularyRepository.existsByUserIdAndSurfaceFormAndReading(any(), any(), any()))
        .thenReturn(false);

    int saved = vocabularyService.saveThemeWords(1L, 1L, ThemeStage.WORD);

    assertThat(saved).isEqualTo(2);
    ArgumentCaptor<VocabularyEntry> captor = ArgumentCaptor.forClass(VocabularyEntry.class);
    verify(vocabularyRepository, times(2)).save(captor.capture());
    VocabularyEntry first = captor.getAllValues().get(0);
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
    when(vocabularyRepository.existsByUserIdAndSurfaceFormAndReading(any(), any(), any()))
        .thenReturn(false);

    int saved = vocabularyService.saveThemeWords(1L, 1L, ThemeStage.EXPRESSION);

    assertThat(saved).isEqualTo(1);
    verify(vocabularyRepository).save(any(VocabularyEntry.class));
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
    when(vocabularyRepository.existsByUserIdAndSurfaceFormAndReading(1L, "水", "みず"))
        .thenReturn(true);
    when(vocabularyRepository.existsByUserIdAndSurfaceFormAndReading(1L, "茶", "ちゃ"))
        .thenReturn(false);

    int saved = vocabularyService.saveThemeWords(1L, 1L, ThemeStage.WORD);

    assertThat(saved).isEqualTo(1);
    ArgumentCaptor<VocabularyEntry> captor = ArgumentCaptor.forClass(VocabularyEntry.class);
    verify(vocabularyRepository).save(captor.capture());
    assertThat(captor.getValue().getSurfaceForm()).isEqualTo("茶");
  }

  @Test
  void saveThemeWords_사용자가_없으면_IllegalStateException을_던진다() {
    when(themeVocabularyRepository.findAllByThemeIdAndStageOrderByDisplayOrder(1L, ThemeStage.WORD))
        .thenReturn(List.of(word(ThemeStage.WORD, "水", "みず", 1)));
    when(userRepository.findById(99L)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> vocabularyService.saveThemeWords(99L, 1L, ThemeStage.WORD))
        .isInstanceOf(IllegalStateException.class);

    verify(vocabularyRepository, never()).save(any());
  }
}
