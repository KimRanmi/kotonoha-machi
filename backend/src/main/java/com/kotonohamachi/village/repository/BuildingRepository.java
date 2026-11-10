package com.kotonohamachi.village.repository;

import com.kotonohamachi.village.Building;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** 마을 건물 데이터에 접근한다. */
public interface BuildingRepository extends JpaRepository<Building, Long> {

  /**
   * 모든 건물을 등록된 순서(id 순)로 조회한다.
   *
   * @return 건물 목록
   */
  List<Building> findAllByOrderByIdAsc();
}
