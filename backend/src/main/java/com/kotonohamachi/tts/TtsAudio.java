package com.kotonohamachi.tts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** 한 문장을 한 음성으로 합성한 MP3. 같은 (음성, 문장)은 한 번만 만들고 모든 사용자가 재사용한다. */
@Entity
@Table(name = "tts_audio")
public class TtsAudio {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String voice;

  @Column(nullable = false)
  private String text;

  @Column(nullable = false)
  private byte[] audio;

  @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
  private OffsetDateTime createdAt;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected TtsAudio() {}

  /**
   * 생성자.
   *
   * @param voice 합성에 쓴 음성 이름
   * @param text 합성한 문장
   * @param audio 합성된 MP3 바이트
   */
  public TtsAudio(String voice, String text, byte[] audio) {
    this.voice = voice;
    this.text = text;
    this.audio = audio;
  }

  public byte[] getAudio() {
    return audio;
  }
}
