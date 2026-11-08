package com.kotonohamachi.resident;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** 사용자와 주민 사이의 친밀도(0~100). 행이 없으면 0으로 취급한다. */
@Entity
@Table(name = "resident_friendship")
public class ResidentFriendship {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false)
  private Long userId;

  @Column(name = "resident_id", nullable = false)
  private Long residentId;

  @Column(nullable = false)
  private int level;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected ResidentFriendship() {}

  public int getLevel() {
    return level;
  }
}
