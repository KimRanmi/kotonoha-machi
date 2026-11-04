package com.kotonohamachi.tts.service;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.tts.TtsAudio;
import com.kotonohamachi.tts.TtsErrorCode;
import com.kotonohamachi.tts.repository.TtsAudioRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * 문장을 음성으로 바꿔준다. 같은 문장은 저장해 둔 음성을 재사용하고(비용 없음), 새로 합성할 때만 Google을
 * 호출하며 사용자당 하루 횟수를 제한한다.
 */
@Service
public class TtsService {

  static final int MAX_TEXT_LENGTH = 300;
  static final int DAILY_SYNTHESIS_LIMIT = 200;
  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  private final TtsAudioRepository ttsAudioRepository;
  private final GoogleTtsClient googleTtsClient;
  private final String voice;
  private final Map<Long, DailyCount> dailyCounts = new ConcurrentHashMap<>();

  /**
   * 생성자.
   *
   * @param ttsAudioRepository 합성해 둔 음성 저장소
   * @param googleTtsClient Google 음성 합성 클라이언트
   * @param voice 사용할 음성 이름
   */
  public TtsService(
      TtsAudioRepository ttsAudioRepository,
      GoogleTtsClient googleTtsClient,
      @Value("${app.tts.voice}") String voice) {
    this.ttsAudioRepository = ttsAudioRepository;
    this.googleTtsClient = googleTtsClient;
    this.voice = voice;
  }

  /**
   * 문장을 읽어주는 MP3를 돌려준다. 저장된 것이 있으면 그것을, 없으면 새로 합성해 저장한 뒤 돌려준다.
   *
   * @param userId 요청한 사용자 ID(하루 합성 횟수 제한에 쓴다)
   * @param text 읽어줄 일본어 문장
   * @return MP3 바이트
   * @throws ApiException 문장이 비었거나 너무 길면(400), 하루 횟수를 넘으면(429), 합성할 수 없으면(502/503)
   */
  public byte[] getAudio(Long userId, String text) {
    String normalizedText = text == null ? "" : text.strip();
    if (normalizedText.isEmpty()
        || normalizedText.codePointCount(0, normalizedText.length()) > MAX_TEXT_LENGTH) {
      throw new ApiException(TtsErrorCode.TEXT_INVALID);
    }

    return ttsAudioRepository
        .findByVoiceAndText(voice, normalizedText)
        .map(TtsAudio::getAudio)
        .orElseGet(() -> synthesizeAndStore(userId, normalizedText));
  }

  private byte[] synthesizeAndStore(Long userId, String text) {
    consumeDailyQuota(userId);
    byte[] audio = googleTtsClient.synthesize(text, voice);
    try {
      ttsAudioRepository.save(new TtsAudio(voice, text, audio));
    } catch (DataIntegrityViolationException e) {
      // 같은 문장을 동시에 요청한 다른 사용자가 먼저 저장한 경우다. 이미 저장돼 있으니 그대로 쓴다.
    }
    return audio;
  }

  private void consumeDailyQuota(Long userId) {
    LocalDate today = LocalDate.now(KST);
    DailyCount updated = dailyCounts.compute(userId, (id, current) -> {
      if (current == null || !current.date().equals(today)) {
        return new DailyCount(today, 1);
      }
      return new DailyCount(today, current.count() + 1);
    });
    if (updated.count() > DAILY_SYNTHESIS_LIMIT) {
      throw new ApiException(TtsErrorCode.DAILY_LIMIT_EXCEEDED);
    }
  }

  /** 사용자 한 명의 하루 합성 횟수. */
  private record DailyCount(LocalDate date, int count) {}
}
