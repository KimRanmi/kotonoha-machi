package com.kotonohamachi.village.repository;

import com.kotonohamachi.village.UserVillagePosition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 사용자별로 마을에서 마지막으로 서 있던 자리 데이터에 접근한다. */
public interface UserVillagePositionRepository extends JpaRepository<UserVillagePosition, Long> {

  /**
   * 자리를 저장한다. 행이 없으면 만들고 있으면 덮어쓰므로, 중복·동시 요청이 와도 오류 없이 마지막 값이 남는다.
   *
   * @param userId 저장할 사용자 ID
   * @param x 가로(x) 좌표
   * @param z 세로(z) 좌표
   */
  @Modifying
  @Query(
      value = "INSERT INTO user_village_position (user_id, x, z, updated_at) "
          + "VALUES (:userId, :x, :z, now()) "
          + "ON CONFLICT (user_id) DO UPDATE "
          + "SET x = EXCLUDED.x, z = EXCLUDED.z, updated_at = EXCLUDED.updated_at",
      nativeQuery = true)
  void upsert(@Param("userId") Long userId, @Param("x") double x, @Param("z") double z);
}
