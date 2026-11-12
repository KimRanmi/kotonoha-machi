package com.kotonohamachi.chat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 사용자와 주민의 오래된 대화를 AI가 줄여 둔 요약 메모. 사용자·주민 쌍마다 한 줄이다. */
@Entity
@Table(name = "chat_summary")
public class ChatSummary {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "resident_id", nullable = false)
  private Long residentId;

  @Column(nullable = false)
  private String summary;

  /** 이 id 이하의 대화 기록은 요약에 이미 반영되었다. */
  @Column(name = "summarized_up_to_id", nullable = false)
  private long summarizedUpToId;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ChatSummary() {}

  /** 처음 만든 요약을 담는다. */
  public static ChatSummary create(
      Long userId, Long residentId, String summary, long summarizedUpToId) {
    ChatSummary chatSummary = new ChatSummary();
    chatSummary.userId = userId;
    chatSummary.residentId = residentId;
    chatSummary.summary = summary;
    chatSummary.summarizedUpToId = summarizedUpToId;
    return chatSummary;
  }

  /** 더 많은 대화를 반영한 새 요약으로 바꾼다. */
  public void update(String summary, long summarizedUpToId) {
    this.summary = summary;
    this.summarizedUpToId = summarizedUpToId;
  }

  public String getSummary() {
    return summary;
  }

  public long getSummarizedUpToId() {
    return summarizedUpToId;
  }
}
