package com.kotonohamachi.village;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 한 사용자가 마을에서 마지막으로 서 있던 자리. 행이 없으면 저장한 적이 없는 사용자다. 저장은 중복·동시 요청에도 안전하도록
 * {@code UserVillagePositionRepository}의 네이티브 upsert로만 하고, 이 클래스는 읽기 전용으로 쓴다.
 */
@Entity
@Table(name = "user_village_position")
public class UserVillagePosition {

  @Id
  @Column(name = "user_id", nullable = false, updatable = false)
  private Long userId;

  @Column(nullable = false, updatable = false)
  private double x;

  @Column(nullable = false, updatable = false)
  private double z;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected UserVillagePosition() {}

  /**
   * 가로(x) 좌표를 반환한다.
   *
   * @return x 좌표
   */
  public double getX() {
    return x;
  }

  /**
   * 세로(z) 좌표를 반환한다.
   *
   * @return z 좌표
   */
  public double getZ() {
    return z;
  }
}
