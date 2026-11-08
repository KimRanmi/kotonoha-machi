package com.kotonohamachi.resident.repository;

import com.kotonohamachi.resident.ResidentFriendship;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 사용자와 주민의 친밀도에 접근한다. */
public interface ResidentFriendshipRepository extends JpaRepository<ResidentFriendship, Long> {

  /**
   * 사용자와 주민 사이의 친밀도를 조회한다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @return 친밀도(행이 없으면 비어 있음)
   */
  Optional<ResidentFriendship> findByUserIdAndResidentId(Long userId, Long residentId);
}
