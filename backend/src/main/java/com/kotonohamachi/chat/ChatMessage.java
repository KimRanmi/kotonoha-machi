package com.kotonohamachi.chat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** 사용자와 주민이 나눈 대화 한 줄. */
@Entity
@Table(name = "chat_message")
public class ChatMessage {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "resident_id", nullable = false)
  private Long residentId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ChatSpeaker speaker;

  @Column(nullable = false)
  private String text;

  /** 주민 대사의 한국어 번역. 플레이어의 말에는 없다. */
  private String translation;

  @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
  private OffsetDateTime createdAt;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ChatMessage() {}

  private ChatMessage(
      Long userId, Long residentId, ChatSpeaker speaker, String text, String translation) {
    this.userId = userId;
    this.residentId = residentId;
    this.speaker = speaker;
    this.text = text;
    this.translation = translation;
  }

  /** 플레이어가 한 말을 기록한다. */
  public static ChatMessage fromPlayer(Long userId, Long residentId, String text) {
    return new ChatMessage(userId, residentId, ChatSpeaker.PLAYER, text, null);
  }

  /** 주민이 한 대답을 기록한다. */
  public static ChatMessage fromResident(
      Long userId, Long residentId, String text, String translation) {
    return new ChatMessage(userId, residentId, ChatSpeaker.RESIDENT, text, translation);
  }

  public Long getId() {
    return id;
  }

  public ChatSpeaker getSpeaker() {
    return speaker;
  }

  public String getText() {
    return text;
  }

  public String getTranslation() {
    return translation;
  }
}
