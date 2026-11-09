package com.kotonohamachi.village;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/**
 * 한 사용자가 열어 둔 마을 건물 하나. 행이 있으면 열린 것이고, 한 번 생기면 지우지 않는다. 행 추가는 중복 요청에도
 * 안전하도록 {@code UserBuildingRepository}의 네이티브 쿼리로만 한다(이 클래스는 읽기 전용으로 쓴다).
 */
@Entity
@Table(name = "user_building")
public class UserBuilding {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "user_id", nullable = false, updatable = false)
  private Long userId;

  @Column(name = "building_id", nullable = false, updatable = false)
  private String buildingId;

  @Column(name = "unlocked_at", nullable = false, updatable = false)
  private OffsetDateTime unlockedAt;

  /** JPA가 엔티티를 만들 때 사용하는 기본 생성자. */
  protected UserBuilding() {}

  /**
   * 열린 건물의 ID를 반환한다.
   *
   * @return 건물 ID
   */
  public String getBuildingId() {
    return buildingId;
  }
}
