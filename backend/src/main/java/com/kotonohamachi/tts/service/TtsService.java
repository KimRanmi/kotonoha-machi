package com.kotonohamachi.tts.service;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.resident.Resident;
import com.kotonohamachi.resident.repository.ResidentRepository;
import com.kotonohamachi.tts.TtsAudio;
import com.kotonohamachi.tts.TtsErrorCode;
import com.kotonohamachi.tts.repository.TtsAudioRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * 문장을 음성으로 바꿔준다. 같은 문장은 저장해 둔 음성을 재사용하고(비용 없음), 새로 합성할 때만 Google을
 * 호출하며 사용자당 하루 횟수를 제한한다.
 */
@Service
public class TtsService {

  private static final Logger log = LoggerFactory.getLogger(TtsService.class);
  static final int MAX_TEXT_LENGTH = 300;
  static final int DAILY_SYNTHESIS_LIMIT = 200;
  private static final ZoneId KST = ZoneId.of("Asia/Seoul");

  private final TtsAudioRepository ttsAudioRepository;
  private final GoogleTtsClient googleTtsClient;
  private final ResidentRepository residentRepository;
  private final String voice;
  private final String femaleVoice;
  private final String maleVoice;
  private final Map<Long, DailyCount> dailyCounts = new ConcurrentHashMap<>();

  /**
   * 생성자.
   *
   * @param ttsAudioRepository 합성해 둔 음성 저장소
   * @param googleTtsClient Google 음성 합성 클라이언트
   * @param residentRepository 주민 저장소(주민 성별로 목소리를 고른다)
   * @param voice 주민이 정해지지 않았을 때 쓸 음성 이름
   * @param femaleVoice 여성 주민의 음성 이름
   * @param maleVoice 남성 주민의 음성 이름
   */
  public TtsService(
      TtsAudioRepository ttsAudioRepository,
      GoogleTtsClient googleTtsClient,
      ResidentRepository residentRepository,
      @Value("${app.tts.voice}") String voice,
      @Value("${app.tts.voice-female}") String femaleVoice,
      @Value("${app.tts.voice-male}") String maleVoice) {
    this.ttsAudioRepository = ttsAudioRepository;
    this.googleTtsClient = googleTtsClient;
    this.residentRepository = residentRepository;
    this.voice = voice;
    this.femaleVoice = femaleVoice;
    this.maleVoice = maleVoice;
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
    return getAudio(userId, text, null, null, null);
  }

  /**
   * 주민의 목소리로 문장을 읽어주는 MP3를 돌려준다. 주민의 성별로 여성/남성 음성을 고르고, 높낮이와 속도를 준 경우 그대로
   * 적용한다. 같은 음성·높낮이·속도·문장은 저장해 둔 것을 재사용한다.
   *
   * @param userId 요청한 사용자 ID(하루 합성 횟수 제한에 쓴다)
   * @param text 읽어줄 일본어 문장
   * @param residentSlug 읽어줄 주민의 고유 키(예: r01). 비었거나 모르는 주민이면 기본 음성을 쓴다
   * @param pitch 높낮이 배율(1.0이 기본, 0.5~2.0). 없으면 조절하지 않는다
   * @param rate 속도 배율(1.0이 기본, 0.5~2.0). 없으면 조절하지 않는다
   * @return MP3 바이트
   * @throws ApiException 문장이 비었거나 너무 길면(400), 하루 횟수를 넘으면(429), 합성할 수 없으면(502/503)
   */
  public byte[] getAudio(Long userId, String text, String residentSlug, Double pitch, Double rate) {
    String normalizedText = text == null ? "" : text.strip();
    if (normalizedText.isEmpty()
        || normalizedText.codePointCount(0, normalizedText.length()) > MAX_TEXT_LENGTH) {
      throw new ApiException(TtsErrorCode.TEXT_INVALID);
    }

    String voiceName = voiceFor(residentSlug);
    double semitones = pitch == null ? 0.0 : toSemitones(pitch);
    double speakingRate = rate == null ? 1.0 : roundRate(rate);
    // 높낮이·속도가 다르면 다른 소리라서 저장 키에 함께 넣는다. 조절이 없으면 음성 이름만 쓴다.
    String voiceKey = semitones == 0.0 && speakingRate == 1.0
        ? voiceName
        : voiceName + "|p" + semitones + "|r" + speakingRate;

    return ttsAudioRepository
        .findByVoiceAndText(voiceKey, normalizedText)
        .map(TtsAudio::getAudio)
        .orElseGet(() -> synthesizeAndStore(
            userId, normalizedText, voiceName, voiceKey, speakingRate, semitones));
  }

  /** 주민의 성별에 맞는 음성 이름을 고른다. 주민이나 성별을 모르면 기본 음성이다. */
  private String voiceFor(String residentSlug) {
    if (residentSlug == null || residentSlug.isBlank()) {
      return voice;
    }
    return residentRepository
        .findBySlug(residentSlug)
        .map(Resident::getGender)
        .map(gender -> "F".equals(gender) ? femaleVoice : "M".equals(gender) ? maleVoice : voice)
        .orElse(voice);
  }

  /** 높낮이 배율(0.5~2.0)을 반음 단위로 바꾼다. 같은 소리가 여러 번 저장되지 않게 0.5 단위로 맞춘다. */
  static double toSemitones(double pitch) {
    double clamped = Math.max(0.5, Math.min(2.0, pitch));
    return Math.round(12 * Math.log(clamped) / Math.log(2) * 2) / 2.0;
  }

  /** 속도 배율을 0.5~2.0으로 제한하고 0.05 단위로 맞춘다. */
  static double roundRate(double rate) {
    double clamped = Math.max(0.5, Math.min(2.0, rate));
    return Math.round(clamped * 20) / 20.0;
  }

  private byte[] synthesizeAndStore(
      Long userId,
      String text,
      String voiceName,
      String voiceKey,
      double speakingRate,
      double semitones) {
    reserveDailyQuota(userId);
    byte[] audio;
    try {
      audio = googleTtsClient.synthesize(text, voiceName, speakingRate, semitones);
    } catch (RuntimeException e) {
      // 합성에 실패했으니 미리 잡아 둔 횟수를 돌려준다.
      releaseDailyQuota(userId);
      throw e;
    }
    try {
      ttsAudioRepository.save(new TtsAudio(voiceKey, text, audio));
    } catch (DataIntegrityViolationException e) {
      // 같은 문장을 동시에 요청한 다른 사용자가 먼저 저장한 경우다. 이미 저장돼 있으니 그대로 쓴다.
      log.info("동시 요청으로 이미 저장된 음성이라 저장을 건너뜁니다: voice={}", voiceKey);
    }
    return audio;
  }

  /**
   * 합성하기 전에 횟수를 하나 먼저 잡아 둔다. 검사와 증가를 한 번에 하므로, 한 사용자가 서로 다른 문장을 동시에
   * 여러 개 보내도 한도를 넘지 못한다. 한도를 넘으면 잡았던 횟수를 되돌리고 거부한다.
   */
  private void reserveDailyQuota(Long userId) {
    LocalDate today = LocalDate.now(KST);
    dailyCounts.values().removeIf(count -> !count.date().equals(today));
    DailyCount reserved = dailyCounts.merge(
        userId,
        new DailyCount(today, 1),
        (current, added) -> new DailyCount(today, current.count() + 1));
    if (reserved.count() > DAILY_SYNTHESIS_LIMIT) {
      releaseDailyQuota(userId);
      throw new ApiException(TtsErrorCode.DAILY_LIMIT_EXCEEDED);
    }
  }

  /** 잡아 둔 횟수를 하나 돌려준다(합성에 실패했거나 한도를 넘었을 때). */
  private void releaseDailyQuota(Long userId) {
    dailyCounts.computeIfPresent(
        userId, (id, current) -> new DailyCount(current.date(), Math.max(0, current.count() - 1)));
  }

  /** 사용자 한 명의 하루 합성 횟수. */
  private record DailyCount(LocalDate date, int count) {}
}
