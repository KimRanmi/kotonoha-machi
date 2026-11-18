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

/** Gemini 호출 한 번의 기록. 비용 판단용이라 프롬프트·대화 내용은 담지 않는다. */
@Entity
@Table(name = "ai_usage")
public class AiUsage {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id")
  private Long userId;

  @Enumerated(EnumType.STRING)
  @Column(name = "call_type", nullable = false)
  private AiCallType callType;

  @Column(nullable = false)
  private String model;

  @Column(name = "input_tokens")
  private Integer inputTokens;

  /** 추론 토큰을 포함한 출력 토큰 수. */
  @Column(name = "output_tokens")
  private Integer outputTokens;

  @Column(nullable = false)
  private boolean success;

  @Column(name = "error_status")
  private Integer errorStatus;

  @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
  private OffsetDateTime createdAt;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected AiUsage() {}

  /** 호출 기록을 만든다. 시각은 DB가 채운다. */
  public static AiUsage of(
      Long userId,
      AiCallType callType,
      String model,
      Integer inputTokens,
      Integer outputTokens,
      boolean success,
      Integer errorStatus) {
    AiUsage usage = new AiUsage();
    usage.userId = userId;
    usage.callType = callType;
    usage.model = model;
    usage.inputTokens = inputTokens;
    usage.outputTokens = outputTokens;
    usage.success = success;
    usage.errorStatus = errorStatus;
    return usage;
  }

  public Long getUserId() {
    return userId;
  }

  public AiCallType getCallType() {
    return callType;
  }

  public String getModel() {
    return model;
  }

  public Integer getInputTokens() {
    return inputTokens;
  }

  public Integer getOutputTokens() {
    return outputTokens;
  }

  public boolean isSuccess() {
    return success;
  }

  public Integer getErrorStatus() {
    return errorStatus;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }
}
