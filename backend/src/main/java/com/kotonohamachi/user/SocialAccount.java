package com.kotonohamachi.user;

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
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** 계정에 연결된 소셜 로그인 하나. 한 {@link User}에 구글/카카오/네이버를 동시에 연결할 수 있어 User와 분리된 테이블로 둔다. */
@Entity
@Table(name = "social_accounts")
public class SocialAccount {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SocialProvider provider;

  @Column(name = "provider_user_id", nullable = false)
  private String providerUserId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected SocialAccount() {}

  /**
   * 생성자.
   *
   * @param user 연결할 계정
   * @param provider 소셜 로그인 제공자
   * @param providerUserId 제공자가 발급한 사용자 고유 ID
   */
  public SocialAccount(User user, SocialProvider provider, String providerUserId) {
    this.user = user;
    this.provider = provider;
    this.providerUserId = providerUserId;
  }

  @PrePersist
  private void onCreate() {
    createdAt = OffsetDateTime.now();
  }

  /**
   * 연결된 계정을 반환한다.
   *
   * @return 연결된 계정
   */
  public User getUser() {
    return user;
  }

  /**
   * 소셜 로그인 제공자를 반환한다.
   *
   * @return 소셜 로그인 제공자
   */
  public SocialProvider getProvider() {
    return provider;
  }

  /**
   * 제공자가 발급한 사용자 고유 ID를 반환한다.
   *
   * @return 제공자 사용자 ID
   */
  public String getProviderUserId() {
    return providerUserId;
  }
}
