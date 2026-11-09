package com.kotonohamachi.village.service;

import com.kotonohamachi.village.VillageBuilding;
import com.kotonohamachi.village.dto.VillageBuildingResponse;
import com.kotonohamachi.village.dto.VillagePositionResponse;
import com.kotonohamachi.village.repository.UserVillagePositionRepository;
import java.util.Arrays;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 마을 건물 목록과 사용자가 마지막으로 서 있던 자리를 다룬다. 모든 건물은 처음부터 열려 있다. */
@Service
public class VillageService {

  private final UserVillagePositionRepository positionRepository;

  /**
   * 생성자.
   *
   * @param positionRepository 마을에서 마지막으로 서 있던 자리 저장소
   */
  public VillageService(UserVillagePositionRepository positionRepository) {
    this.positionRepository = positionRepository;
  }

  /**
   * 건물 목록(항상 집, 카페, 상점 순서)을 조회한다. 모든 건물이 열려 있다.
   *
   * @return 건물 3개의 열림 상태(모두 true)
   */
  public List<VillageBuildingResponse> getBuildings() {
    return Arrays.stream(VillageBuilding.values())
        .map(building -> new VillageBuildingResponse(building.getId(), true))
        .toList();
  }

  /**
   * 사용자가 마을에서 마지막으로 서 있던 자리를 조회한다.
   *
   * @param userId 조회할 사용자 ID(로그인한 본인)
   * @return 마지막 자리. 저장한 적이 없으면 두 좌표 모두 null
   */
  @Transactional(readOnly = true)
  public VillagePositionResponse getPosition(Long userId) {
    return positionRepository
        .findById(userId)
        .map(position -> new VillagePositionResponse(position.getX(), position.getZ()))
        .orElse(new VillagePositionResponse(null, null));
  }

  /**
   * 사용자가 마을에서 서 있는 자리를 저장한다. 좌표 범위는 요청 검증이 이미 확인했다.
   *
   * @param userId 저장할 사용자 ID(로그인한 본인)
   * @param x 가로(x) 좌표
   * @param z 세로(z) 좌표
   */
  @Transactional
  public void savePosition(Long userId, double x, double z) {
    positionRepository.upsert(userId, x, z);
  }
}
