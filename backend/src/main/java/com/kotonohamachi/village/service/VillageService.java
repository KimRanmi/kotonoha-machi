package com.kotonohamachi.village.service;

import com.kotonohamachi.theme.repository.ThemeProgressRepository;
import com.kotonohamachi.village.UserBuilding;
import com.kotonohamachi.village.VillageBuilding;
import com.kotonohamachi.village.dto.VillageBuildingResponse;
import com.kotonohamachi.village.dto.VillagePositionResponse;
import com.kotonohamachi.village.repository.UserBuildingRepository;
import com.kotonohamachi.village.repository.UserVillagePositionRepository;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 마을 건물의 열림 상태와 사용자가 마지막으로 서 있던 자리를 DB에 저장하고 조회한다. 열림 규칙(집 0개, 카페 1개, 상점 3개
 * 완료)은 AI가 아니라 이 일반 코드가 판단하며, 한 번 열린 건물은 규칙이 바뀌어도 다시 잠기지 않는다.
 */
@Service
public class VillageService {

  private final UserBuildingRepository userBuildingRepository;
  private final ThemeProgressRepository themeProgressRepository;
  private final UserVillagePositionRepository positionRepository;

  /**
   * 생성자.
   *
   * @param userBuildingRepository 열린 건물 저장소
   * @param themeProgressRepository 사용자별 테마 진행 상태 저장소(완료 테마 수 계산용)
   * @param positionRepository 마을에서 마지막으로 서 있던 자리 저장소
   */
  public VillageService(
      UserBuildingRepository userBuildingRepository,
      ThemeProgressRepository themeProgressRepository,
      UserVillagePositionRepository positionRepository) {
    this.userBuildingRepository = userBuildingRepository;
    this.themeProgressRepository = themeProgressRepository;
    this.positionRepository = positionRepository;
  }

  /**
   * 사용자의 건물 목록(항상 집, 카페, 상점 순서)을 열림 여부와 함께 조회한다. 가입 직후 사용자는 집 행이 아직 없을 수
   * 있어서, 조회하기 전에 열려야 하는데 빠진 건물(집 등)을 먼저 채운다.
   *
   * @param userId 조회할 사용자 ID(로그인한 본인)
   * @return 건물 3개의 열림 상태
   */
  @Transactional
  public List<VillageBuildingResponse> getBuildings(Long userId) {
    unlockBuildings(userId);
    Set<String> unlockedIds = userBuildingRepository.findAllByUserId(userId).stream()
        .map(UserBuilding::getBuildingId)
        .collect(Collectors.toSet());
    return Arrays.stream(VillageBuilding.values())
        .map(building ->
            new VillageBuildingResponse(building.getId(), unlockedIds.contains(building.getId())))
        .toList();
  }

  /**
   * 사용자의 완료 테마 수를 세어, 조건을 넘었는데 아직 열리지 않은 건물을 연다. 이미 열린 건물은 건드리지 않아서 여러 번
   * 호출해도 안전하다. 테마를 완료한 같은 트랜잭션 안에서 호출해야 한다.
   *
   * @param userId 건물을 열 사용자 ID
   */
  @Transactional
  public void unlockBuildings(Long userId) {
    long completedThemes = themeProgressRepository.countByUserIdAndCompletedTrue(userId);
    for (VillageBuilding building : VillageBuilding.values()) {
      if (completedThemes >= building.getRequiredCompletedThemes()) {
        userBuildingRepository.unlockIfAbsent(userId, building.getId());
      }
    }
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
