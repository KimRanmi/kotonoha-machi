package com.kotonohamachi.resident.repository;

import com.kotonohamachi.resident.Resident;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 주민 정보에 접근한다. */
public interface ResidentRepository extends JpaRepository<Resident, Long> {

  /**
   * 시트와 DB를 잇는 고유 키로 주민을 조회한다.
   *
   * @param slug 주민 고유 키(예: r01)
   * @return 주민(없으면 비어 있음)
   */
  Optional<Resident> findBySlug(String slug);

  /**
   * 어느 건물에든 속한 주민을 id 순으로 조회한다.
   *
   * @return 소속 건물이 있는 주민 목록
   */
  List<Resident> findAllByWorkBuildingIsNotNullOrderByIdAsc();
}
