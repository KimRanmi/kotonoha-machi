package com.kotonohamachi.village.repository;

import com.kotonohamachi.village.UserBuilding;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 사용자별로 열린 마을 건물 데이터에 접근한다. */
public interface UserBuildingRepository extends JpaRepository<UserBuilding, Long> {

  /**
   * 사용자가 열어 둔 건물 목록을 조회한다.
   *
   * @param userId 조회할 사용자 ID
   * @return 열린 건물 목록
   */
  List<UserBuilding> findAllByUserId(Long userId);

  /**
   * 건물을 연다. 이미 열려 있으면 아무 일도 하지 않아서(중복 요청이 동시에 와도 오류 없이) 몇 번을 호출해도 안전하다.
   *
   * @param userId 건물을 여는 사용자 ID
   * @param buildingId 열 건물 ID
   */
  @Modifying
  @Query(
      value = "INSERT INTO user_building (user_id, building_id, unlocked_at) "
          + "VALUES (:userId, :buildingId, now()) "
          + "ON CONFLICT (user_id, building_id) DO NOTHING",
      nativeQuery = true)
  void unlockIfAbsent(@Param("userId") Long userId, @Param("buildingId") String buildingId);
}
