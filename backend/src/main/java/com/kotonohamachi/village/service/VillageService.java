package com.kotonohamachi.village.service;

import com.kotonohamachi.resident.Resident;
import com.kotonohamachi.resident.repository.ResidentRepository;
import com.kotonohamachi.village.Building;
import com.kotonohamachi.village.VillageMap;
import com.kotonohamachi.village.dto.VillageBuildingResponse;
import com.kotonohamachi.village.dto.VillageMapResponse;
import com.kotonohamachi.village.dto.VillagePositionResponse;
import com.kotonohamachi.village.repository.BuildingRepository;
import com.kotonohamachi.village.repository.UserVillagePositionRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 마을 건물 목록과 사용자가 마을에서 마지막으로 서 있던 자리를 다룬다. 건물은 모두 처음부터 열려 있다. */
@Service
public class VillageService {

  private final BuildingRepository buildingRepository;
  private final ResidentRepository residentRepository;
  private final UserVillagePositionRepository positionRepository;

  /**
   * 생성자.
   *
   * @param buildingRepository 건물 저장소
   * @param residentRepository 주민 저장소(건물에 속한 주민 조회용)
   * @param positionRepository 마을에서 마지막으로 서 있던 자리 저장소
   */
  public VillageService(
      BuildingRepository buildingRepository,
      ResidentRepository residentRepository,
      UserVillagePositionRepository positionRepository) {
    this.buildingRepository = buildingRepository;
    this.residentRepository = residentRepository;
    this.positionRepository = positionRepository;
  }

  /**
   * 마을 땅 크기를 조회한다.
   *
   * @return 땅의 절반 크기와 설 수 있는 가장 바깥 좌표
   */
  public VillageMapResponse getMap() {
    return new VillageMapResponse(VillageMap.HALF_SIZE, VillageMap.MAX_WALK_COORDINATE);
  }

  /**
   * 마을 건물 목록을 등록된 순서로 조회한다. 건물마다 같은 장소(location)에서 지내는 모든 주민의 slug를 등록된 순서로 함께
   * 준다. 그런 주민이 없으면 목록은 비어 있다.
   *
   * @return 건물 목록
   */
  @Transactional(readOnly = true)
  public List<VillageBuildingResponse> getBuildings() {
    Map<String, List<String>> residentsByLocation = new HashMap<>();
    for (Resident resident : residentRepository.findAllByLocationIsNotNullOrderByIdAsc()) {
      residentsByLocation
          .computeIfAbsent(resident.getLocation(), location -> new ArrayList<>())
          .add(resident.getSlug());
    }
    return buildingRepository.findAllByOrderByIdAsc().stream()
        .map(building -> toResponse(
            building, residentsByLocation.getOrDefault(building.getLocation(), List.of())))
        .toList();
  }

  private VillageBuildingResponse toResponse(Building building, List<String> residentSlugs) {
    return new VillageBuildingResponse(
        building.getSlug(),
        building.getLabel(),
        building.getX(),
        building.getZ(),
        building.getWidth(),
        building.getDepth(),
        building.getHeight(),
        building.getRotation(),
        building.getColor(),
        residentSlugs);
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
