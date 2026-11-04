package com.kotonohamachi.tts.repository;

import com.kotonohamachi.tts.TtsAudio;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 합성해 둔 음성(TTS 캐시)에 접근한다. */
public interface TtsAudioRepository extends JpaRepository<TtsAudio, Long> {

  /**
   * 같은 음성으로 같은 문장을 이미 합성해 둔 것이 있는지 조회한다.
   *
   * @param voice 음성 이름
   * @param text 문장
   * @return 저장된 음성(없으면 비어 있음)
   */
  Optional<TtsAudio> findByVoiceAndText(String voice, String text);
}
