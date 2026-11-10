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

/** {@link VillageService#getBuildings()}가 건물마다 가장 먼저 등록된 같은 장소의 주민을 붙이는지 검증한다. */
class VillageServiceTest {

  private final BuildingRepository buildingRepository = mock(BuildingRepository.class);
  private final ResidentRepository residentRepository = mock(ResidentRepository.class);
  private final VillageService villageService = new VillageService(
      buildingRepository, residentRepository, mock(UserVillagePositionRepository.class));

  private static Building building(String slug, String location) {
    Building building = mock(Building.class);
    when(building.getSlug()).thenReturn(slug);
    when(building.getLocation()).thenReturn(location);
    when(building.getLabel()).thenReturn(slug);
    when(building.getColor()).thenReturn("#FFFFFF");
    return building;
  }

  private static Resident resident(String slug, String location) {
    Resident resident = mock(Resident.class);
    when(resident.getSlug()).thenReturn(slug);
    when(resident.getLocation()).thenReturn(location);
    return resident;
  }

  @Test
  void 건물마다_같은_장소에서_가장_먼저_등록된_주민의_slug를_붙인다() {
    // 목 객체는 when() 바깥에서 먼저 만들어야 한다(스텁 도중에 다른 목을 설정하면 Mockito가 오류를 낸다).
    List<Building> buildings = List.of(building("home", "집"), building("cafe", "카페"));
    List<Resident> residents =
        List.of(resident("r05", "카페"), resident("r11", "카페"), resident("r01", "거리"));
    when(buildingRepository.findAllByOrderByIdAsc()).thenReturn(buildings);
    when(residentRepository.findAllByLocationIsNotNullOrderByIdAsc()).thenReturn(residents);

    List<VillageBuildingResponse> result = villageService.getBuildings();

    assertThat(result).extracting(VillageBuildingResponse::id).containsExactly("home", "cafe");
    assertThat(result.get(0).residentSlug()).isNull();
    assertThat(result.get(1).residentSlug()).isEqualTo("r05");
  }

  @Test
  void 건물이_없으면_빈_목록을_돌려준다() {
    when(buildingRepository.findAllByOrderByIdAsc()).thenReturn(List.of());
    when(residentRepository.findAllByLocationIsNotNullOrderByIdAsc()).thenReturn(List.of());

    assertThat(villageService.getBuildings()).isEmpty();
  }
}
