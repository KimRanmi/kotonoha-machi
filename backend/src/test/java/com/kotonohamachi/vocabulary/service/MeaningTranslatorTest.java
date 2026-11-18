package com.kotonohamachi.vocabulary.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kotonohamachi.chat.ChatErrorCode;
import com.kotonohamachi.chat.service.GeminiClient;
import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.vocabulary.dto.DictionaryWord;
import org.junit.jupiter.api.Test;

/** 번역 캐시와 실패 시 영어 뜻 폴백을 검증한다. */
class MeaningTranslatorTest {

  private static final DictionaryWord WORD = new DictionaryWord("漆器", "しっき", "lacquerware", null);

  @Test
  void 같은_단어는_Gemini를_한_번만_호출한다() {
    GeminiClient gemini = mock(GeminiClient.class);
    when(gemini.translateMeaning(eq(WORD), any())).thenReturn("칠기");
    MeaningTranslator translator = new MeaningTranslator(gemini);

    assertThat(translator.toKorean(WORD, 1L)).isEqualTo("칠기");
    assertThat(translator.toKorean(WORD, 1L)).isEqualTo("칠기");

    verify(gemini, times(1)).translateMeaning(eq(WORD), any());
  }

  @Test
  void 번역이_실패하면_영어_뜻을_돌려주고_캐시하지_않는다() {
    GeminiClient gemini = mock(GeminiClient.class);
    when(gemini.translateMeaning(eq(WORD), any()))
        .thenThrow(new ApiException(ChatErrorCode.DAILY_LIMIT_EXCEEDED))
        .thenReturn("칠기");
    MeaningTranslator translator = new MeaningTranslator(gemini);

    assertThat(translator.toKorean(WORD, 1L)).isEqualTo("lacquerware");
    assertThat(translator.toKorean(WORD, 1L)).isEqualTo("칠기");
  }
}
