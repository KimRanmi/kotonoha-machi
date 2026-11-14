package com.kotonohamachi.tts.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.resident.Resident;
import com.kotonohamachi.resident.repository.ResidentRepository;
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
  private static final String FEMALE = "ja-JP-Neural2-B-female";
  private static final String MALE = "ja-JP-Neural2-C-male";

  @Mock
  private TtsAudioRepository ttsAudioRepository;

  @Mock
  private GoogleTtsClient googleTtsClient;

  @Mock
  private ResidentRepository residentRepository;

  private TtsService ttsService;

  @BeforeEach
  void setUp() {
    ttsService = new TtsService(
        ttsAudioRepository, googleTtsClient, residentRepository, VOICE, FEMALE, MALE);
  }

  @Test
  void getAudio_저장된_음성이_있으면_Google을_호출하지_않고_재사용한다() {
    byte[] saved = {1, 2, 3};
    when(ttsAudioRepository.findByVoiceAndText(VOICE, "こんにちは"))
        .thenReturn(Optional.of(new TtsAudio(VOICE, "こんにちは", saved)));

    byte[] result = ttsService.getAudio(1L, "こんにちは");

    assertThat(result).isEqualTo(saved);
    verify(googleTtsClient, never()).synthesize(any(), any(), anyDouble(), anyDouble());
  }

  @Test
  void getAudio_저장된_음성이_없으면_합성해서_저장한다() {
    byte[] synthesized = {4, 5, 6};
    when(ttsAudioRepository.findByVoiceAndText(VOICE, "ありがとう")).thenReturn(Optional.empty());
    when(googleTtsClient.synthesize("ありがとう", VOICE, 1.0, 0.0)).thenReturn(synthesized);

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
    verify(googleTtsClient, never()).synthesize(any(), any(), anyDouble(), anyDouble());
  }

  @Test
  void getAudio_합성에_실패하면_하루_횟수를_차감하지_않는다() {
    when(ttsAudioRepository.findByVoiceAndText(any(), any())).thenReturn(Optional.empty());
    when(googleTtsClient.synthesize(any(), any(), anyDouble(), anyDouble()))
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
    when(googleTtsClient.synthesize(any(), any(), anyDouble(), anyDouble()))
        .thenReturn(new byte[] {1});
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
    verify(googleTtsClient, times(TtsService.DAILY_SYNTHESIS_LIMIT))
        .synthesize(any(), any(), anyDouble(), anyDouble());
  }

  @Test
  void getAudio_하루_합성_횟수를_넘으면_거부한다() {
    when(ttsAudioRepository.findByVoiceAndText(any(), any())).thenReturn(Optional.empty());
    when(googleTtsClient.synthesize(any(), any(), anyDouble(), anyDouble()))
        .thenReturn(new byte[] {1});

    for (int i = 0; i < TtsService.DAILY_SYNTHESIS_LIMIT; i++) {
      ttsService.getAudio(1L, "文" + i);
    }
    ApiException exceeded =
        catchThrowableOfType(ApiException.class, () -> ttsService.getAudio(1L, "もう一つ"));

    assertThat(exceeded.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    verify(googleTtsClient, times(TtsService.DAILY_SYNTHESIS_LIMIT))
        .synthesize(any(), any(), anyDouble(), anyDouble());
  }

  private void stubResident(String slug, String gender) {
    Resident resident = org.mockito.Mockito.mock(Resident.class);
    when(resident.getGender()).thenReturn(gender);
    when(residentRepository.findBySlug(slug)).thenReturn(Optional.of(resident));
  }

  private void stubSynthesis() {
    when(ttsAudioRepository.findByVoiceAndText(any(), any())).thenReturn(Optional.empty());
    when(googleTtsClient.synthesize(any(), any(), anyDouble(), anyDouble()))
        .thenReturn(new byte[] {1});
  }

  @Test
  void getAudio_여성_주민은_여성_음성으로_합성한다() {
    stubResident("r01", "F");
    stubSynthesis();

    ttsService.getAudio(1L, "やあ", "r01", null, null);

    verify(googleTtsClient).synthesize("やあ", FEMALE, 1.0, 0.0);
    verify(ttsAudioRepository).findByVoiceAndText(FEMALE, "やあ");
  }

  @Test
  void getAudio_남성_주민은_남성_음성으로_합성한다() {
    stubResident("r02", "M");
    stubSynthesis();

    ttsService.getAudio(1L, "やあ", "r02", null, null);

    verify(googleTtsClient).synthesize("やあ", MALE, 1.0, 0.0);
  }

  @Test
  void getAudio_성별이_없거나_모르는_주민이면_기본_음성이다() {
    stubResident("r03", null);
    when(residentRepository.findBySlug("nope")).thenReturn(Optional.empty());
    stubSynthesis();

    ttsService.getAudio(1L, "一", "r03", null, null);
    ttsService.getAudio(1L, "二", "nope", null, null);

    verify(googleTtsClient).synthesize("一", VOICE, 1.0, 0.0);
    verify(googleTtsClient).synthesize("二", VOICE, 1.0, 0.0);
  }

  @Test
  void getAudio_높낮이와_속도를_변환해_합성하고_저장_키에_접미를_붙인다() {
    stubSynthesis();

    ttsService.getAudio(1L, "やあ", null, 2.0, 1.01);

    verify(googleTtsClient).synthesize("やあ", VOICE, 1.0, 3.0);
    // 조회에 쓴 키가 저장 키와 같다.
    verify(ttsAudioRepository).findByVoiceAndText(VOICE + "|p3.0|r1.0", "やあ");
  }

  @Test
  void getAudio_조절이_없으면_저장_키는_음성_이름_그대로다() {
    stubSynthesis();

    ttsService.getAudio(1L, "やあ", null, 1.0, 1.0);

    verify(ttsAudioRepository).findByVoiceAndText(VOICE, "やあ");
  }

  @Test
  void toSemitones_큰_배율은_3반음으로_잘린다() {
    assertThat(TtsService.toSemitones(2.0)).isEqualTo(TtsService.MAX_SEMITONES).isEqualTo(3.0);
    assertThat(TtsService.toSemitones(0.5)).isEqualTo(-3.0);
    assertThat(TtsService.toSemitones(10.0)).isEqualTo(3.0);
    assertThat(TtsService.toSemitones(0.01)).isEqualTo(-3.0);
  }

  @Test
  void toSemitones_작은_배율_차이는_0점5_단위로_그대로_바뀐다() {
    assertThat(TtsService.toSemitones(1.0)).isEqualTo(0.0);
    assertThat(TtsService.toSemitones(1.1)).isEqualTo(1.5);
    assertThat(TtsService.toSemitones(0.9)).isEqualTo(-2.0);
  }

  @Test
  void roundRate_속도를_0점05_단위로_맞추고_범위를_제한한다() {
    assertThat(TtsService.roundRate(1.02)).isEqualTo(1.0);
    assertThat(TtsService.roundRate(1.23)).isEqualTo(1.25);
    assertThat(TtsService.roundRate(9)).isEqualTo(2.0);
    assertThat(TtsService.roundRate(0.1)).isEqualTo(0.5);
  }

  @Test
  void toSemitones_NaN이면_0으로_방어한다() {
    assertThat(TtsService.toSemitones(Double.NaN)).isEqualTo(0.0);
  }

  @Test
  void roundRate_NaN이면_1로_방어한다() {
    assertThat(TtsService.roundRate(Double.NaN)).isEqualTo(1.0);
  }

  @Test
  void getAudio_속도가_NaN이어도_속도_1로_합성한다() {
    stubResident("r01", "F");
    stubSynthesis();

    ttsService.getAudio(1L, "やあ", "r01", null, Double.NaN);

    verify(googleTtsClient).synthesize("やあ", FEMALE, 1.0, 0.0);
  }
}
