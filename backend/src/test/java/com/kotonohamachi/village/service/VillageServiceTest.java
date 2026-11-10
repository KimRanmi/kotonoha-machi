package com.kotonohamachi.village.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.kotonohamachi.resident.Resident;
import com.kotonohamachi.resident.repository.ResidentRepository;
import com.kotonohamachi.village.Building;
import com.kotonohamachi.village.dto.VillageBuildingResponse;
import com.kotonohamachi.village.repository.BuildingRepository;
import com.kotonohamachi.village.repository.UserVillagePositionRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

/** {@link VillageService#getBuildings()}가 건물마다 가장 먼저 등록된 소속 주민을 붙이는지 검증한다. */
class VillageServiceTest {

  private final BuildingRepository buildingRepository = mock(BuildingRepository.class);
  private final ResidentRepository residentRepository = mock(ResidentRepository.class);
  private final VillageService villageService = new VillageService(
      buildingRepository, residentRepository, mock(UserVillagePositionRepository.class));

  private static Building building(String slug) {
    Building building = mock(Building.class);
    when(building.getSlug()).thenReturn(slug);
    when(building.getLabel()).thenReturn(slug);
    when(building.getColor()).thenReturn("#FFFFFF");
    return building;
  }

  private static Resident resident(String slug, String workBuilding) {
    Resident resident = mock(Resident.class);
    when(resident.getSlug()).thenReturn(slug);
    when(resident.getWorkBuilding()).thenReturn(workBuilding);
    return resident;
  }

  @Test
  void 건물마다_가장_먼저_등록된_소속_주민의_slug를_붙인다() {
    // 목 객체는 when() 바깥에서 먼저 만들어야 한다(스텁 도중에 다른 목을 설정하면 Mockito가 오류를 낸다).
    List<Building> buildings = List.of(building("home"), building("cafe"));
    List<Resident> residents = List.of(resident("r05", "cafe"), resident("r11", "cafe"));
    when(buildingRepository.findAllByOrderByIdAsc()).thenReturn(buildings);
    when(residentRepository.findAllByWorkBuildingIsNotNullOrderByIdAsc()).thenReturn(residents);

    List<VillageBuildingResponse> result = villageService.getBuildings();

    assertThat(result).extracting(VillageBuildingResponse::id).containsExactly("home", "cafe");
    assertThat(result.get(0).residentSlug()).isNull();
    assertThat(result.get(1).residentSlug()).isEqualTo("r05");
  }

  @Test
  void 건물이_없으면_빈_목록을_돌려준다() {
    when(buildingRepository.findAllByOrderByIdAsc()).thenReturn(List.of());
    when(residentRepository.findAllByWorkBuildingIsNotNullOrderByIdAsc()).thenReturn(List.of());

    assertThat(villageService.getBuildings()).isEmpty();
  }
}
