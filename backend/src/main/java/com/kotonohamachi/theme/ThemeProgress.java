package com.kotonohamachi.theme;

import com.kotonohamachi.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.OffsetDateTime;

/**
 * 한 사용자가 테마 하나를 얼마나 진행했는지 나타낸다. 테마는 한자 → 단어 → 표현 → 예문 → 독해 순서로 진행하며, 이전
 * 단계를 끝내야 다음 단계로 넘어간다({@link ThemeStage} 참고).
 */
@Entity
@Table(
    name = "theme_progress",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "theme_id"}))
public class ThemeProgress {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "theme_id", nullable = false)
  private Theme theme;

  @Enumerated(EnumType.STRING)
  @Column(name = "current_stage", nullable = false)
  private ThemeStage currentStage;

  @Column(nullable = false)
  private boolean completed;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private OffsetDateTime updatedAt;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ThemeProgress() {}

  /**
   * 테마를 처음 시작할 때 쓰는 생성자. 첫 단계({@link ThemeStage#KANJI})부터 시작한다.
   *
   * @param user 진행하는 사용자
   * @param theme 진행할 테마
   */
  public ThemeProgress(User user, Theme theme) {
    this.user = user;
    this.theme = theme;
    this.currentStage = ThemeStage.KANJI;
    this.completed = false;
  }

  @PrePersist
  private void onCreate() {
    OffsetDateTime now = OffsetDateTime.now();
    createdAt = now;
    updatedAt = now;
  }

  @PreUpdate
  private void onUpdate() {
    updatedAt = OffsetDateTime.now();
  }

  /**
   * 주어진 단계를 지금 완료할 수 있는 상태인지 확인한다. 이미 테마를 끝냈거나, 지금 진행해야 할 단계가 아니면(건너뛰기)
   * 완료할 수 없다.
   *
   * @param stage 완료하려는 단계
   * @return 완료할 수 있으면 true
   */
  public boolean canComplete(ThemeStage stage) {
    return !completed && currentStage == stage;
  }

  /**
   * 지금 단계를 완료 처리하고 다음 단계로 넘어간다. 마지막 단계({@link ThemeStage#READING})였다면 테마 전체를
   * 완료 처리한다. 호출하기 전에 {@link #canComplete}로 먼저 확인해야 한다.
   */
  public void completeCurrentStage() {
    currentStage.next().ifPresentOrElse(next -> currentStage = next, () -> completed = true);
  }

  /**
   * 진행 ID를 반환한다.
   *
   * @return 진행 ID
   */
  public Long getId() {
    return id;
  }

  /**
   * 진행 중인 테마를 반환한다.
   *
   * @return 진행 중인 테마
   */
  public Theme getTheme() {
    return theme;
  }

  /**
   * 지금 진행해야 할 단계를 반환한다.
   *
   * @return 지금 단계
   */
  public ThemeStage getCurrentStage() {
    return currentStage;
  }

  /**
   * 테마를 끝까지 완료했는지 확인한다.
   *
   * @return 완료했으면 true
   */
  public boolean isCompleted() {
    return completed;
  }
}
