package com.kotonohamachi.village.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.kotonohamachi.village.dto.VillageBuildingResponse;
import java.util.List;
import org.junit.jupiter.api.Test;

/** {@link VillageService}의 건물 목록(모든 건물이 처음부터 열림)을 검증한다. DB가 필요 없어 단위 테스트로 충분하다. */
class VillageServiceTest {

  private final VillageService villageService = new VillageService(null);

  @Test
  void 모든_건물이_열려_있다() {
    List<VillageBuildingResponse> buildings = villageService.getBuildings();

    assertThat(buildings).allMatch(VillageBuildingResponse::unlocked);
  }

  @Test
  void 응답_순서는_항상_집_카페_상점이다() {
    assertThat(villageService.getBuildings())
        .extracting(VillageBuildingResponse::id)
        .containsExactly("home", "cafe", "shop");
  }
}
