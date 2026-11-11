package com.kotonohamachi.resident.repository;

import com.kotonohamachi.resident.ResidentFriendship;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

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

  /**
   * 친밀도를 올리려고 행을 잠그고 조회한다. 같은 사용자의 대화가 동시에 와도 하루 한도를 넘지 않게 한다.
   *
   * @param userId 사용자 ID
   * @param residentId 주민 ID
   * @return 친밀도(행이 없으면 비어 있음)
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<ResidentFriendship> findForUpdateByUserIdAndResidentId(Long userId, Long residentId);

  /**
   * 사용자의 모든 주민 친밀도를 조회한다.
   *
   * @param userId 사용자 ID
   * @return 행이 있는 주민들의 친밀도
   */
  List<ResidentFriendship> findAllByUserId(Long userId);
}
