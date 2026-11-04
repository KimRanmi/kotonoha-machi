package com.kotonohamachi.tts.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.tts.TtsAudio;
import com.kotonohamachi.tts.TtsErrorCode;
import com.kotonohamachi.tts.repository.TtsAudioRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

/** {@link TtsService}의 캐시 재사용, 입력 검증, 하루 합성 횟수 제한을 Mockito로 단위 테스트한다. */
@ExtendWith(MockitoExtension.class)
class TtsServiceTest {

  private static final String VOICE = "ja-JP-Neural2-B";

  @Mock
  private TtsAudioRepository ttsAudioRepository;

  @Mock
  private GoogleTtsClient googleTtsClient;

  private TtsService ttsService;

  @BeforeEach
  void setUp() {
    ttsService = new TtsService(ttsAudioRepository, googleTtsClient, VOICE);
  }

  @Test
  void getAudio_저장된_음성이_있으면_Google을_호출하지_않고_재사용한다() {
    byte[] saved = {1, 2, 3};
    when(ttsAudioRepository.findByVoiceAndText(VOICE, "こんにちは"))
        .thenReturn(Optional.of(new TtsAudio(VOICE, "こんにちは", saved)));

    byte[] result = ttsService.getAudio(1L, "こんにちは");

    assertThat(result).isEqualTo(saved);
    verify(googleTtsClient, never()).synthesize(any(), any());
  }

  @Test
  void getAudio_저장된_음성이_없으면_합성해서_저장한다() {
    byte[] synthesized = {4, 5, 6};
    when(ttsAudioRepository.findByVoiceAndText(VOICE, "ありがとう")).thenReturn(Optional.empty());
    when(googleTtsClient.synthesize("ありがとう", VOICE)).thenReturn(synthesized);

    byte[] result = ttsService.getAudio(1L, "ありがとう");

    assertThat(result).isEqualTo(synthesized);
    verify(ttsAudioRepository).save(any(TtsAudio.class));
  }

  @Test
  void getAudio_앞뒤_공백은_제거하고_조회한다() {
    when(ttsAudioRepository.findByVoiceAndText(VOICE, "水"))
        .thenReturn(Optional.of(new TtsAudio(VOICE, "水", new byte[] {7})));

    ttsService.getAudio(1L, "  水  ");

    verify(ttsAudioRepository).findByVoiceAndText(VOICE, "水");
  }

  @Test
  void getAudio_빈_문장이나_너무_긴_문장은_거부한다() {
    ApiException blank =
        catchThrowableOfType(ApiException.class, () -> ttsService.getAudio(1L, "   "));
    ApiException tooLong = catchThrowableOfType(
        ApiException.class,
        () -> ttsService.getAudio(1L, "あ".repeat(TtsService.MAX_TEXT_LENGTH + 1)));

    assertThat(blank.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    assertThat(tooLong.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
    verify(googleTtsClient, never()).synthesize(any(), any());
  }

  @Test
  void getAudio_합성에_실패하면_하루_횟수를_차감하지_않는다() {
    when(ttsAudioRepository.findByVoiceAndText(any(), any())).thenReturn(Optional.empty());
    when(googleTtsClient.synthesize(any(), any()))
        .thenThrow(new ApiException(TtsErrorCode.UNAVAILABLE));

    for (int i = 0; i < TtsService.DAILY_SYNTHESIS_LIMIT + 5; i++) {
      ApiException failed =
          catchThrowableOfType(ApiException.class, () -> ttsService.getAudio(1L, "失敗"));
      assertThat(failed.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Test
  void getAudio_같은_사용자가_동시에_요청해도_하루_한도를_넘지_못한다() throws Exception {
    when(ttsAudioRepository.findByVoiceAndText(any(), any())).thenReturn(Optional.empty());
    when(googleTtsClient.synthesize(any(), any())).thenReturn(new byte[] {1});
    int requestCount = TtsService.DAILY_SYNTHESIS_LIMIT + 50;
    ExecutorService executor = Executors.newFixedThreadPool(16);

    List<Future<Boolean>> results = new ArrayList<>();
    for (int i = 0; i < requestCount; i++) {
      String text = "並列" + i;
      results.add(executor.submit(() -> {
        try {
          ttsService.getAudio(1L, text);
          return true;
        } catch (ApiException e) {
          return false;
        }
      }));
    }
    int succeeded = 0;
    for (Future<Boolean> result : results) {
      if (result.get()) {
        succeeded++;
      }
    }
    executor.shutdown();

    assertThat(succeeded).isEqualTo(TtsService.DAILY_SYNTHESIS_LIMIT);
    verify(googleTtsClient, times(TtsService.DAILY_SYNTHESIS_LIMIT)).synthesize(any(), any());
  }

  @Test
  void getAudio_하루_합성_횟수를_넘으면_거부한다() {
    when(ttsAudioRepository.findByVoiceAndText(any(), any())).thenReturn(Optional.empty());
    when(googleTtsClient.synthesize(any(), any())).thenReturn(new byte[] {1});

    for (int i = 0; i < TtsService.DAILY_SYNTHESIS_LIMIT; i++) {
      ttsService.getAudio(1L, "文" + i);
    }
    ApiException exceeded =
        catchThrowableOfType(ApiException.class, () -> ttsService.getAudio(1L, "もう一つ"));

    assertThat(exceeded.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    verify(googleTtsClient, times(TtsService.DAILY_SYNTHESIS_LIMIT)).synthesize(any(), any());
  }
}
