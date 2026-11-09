package com.kotonohamachi.village.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.user.User;
import com.kotonohamachi.village.dto.VillageBuildingResponse;
import com.kotonohamachi.village.service.VillageService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 마을 건물의 열림 상태 조회 API. */
@RestController
public class VillageController {

  private final VillageService villageService;

  /**
   * 생성자.
   *
   * @param villageService 마을 건물 서비스
   */
  public VillageController(VillageService villageService) {
    this.villageService = villageService;
  }

  /**
   * 로그인한 사용자의 마을 건물(집, 카페, 상점) 열림 상태를 조회한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @return 건물 3개의 열림 상태(항상 집, 카페, 상점 순서)
   */
  @GetMapping("/api/village/buildings")
  public List<VillageBuildingResponse> getBuildings(Authentication authentication) {
    User user = AuthPrincipal.resolve(authentication);
    return villageService.getBuildings(user.getId());
  }
}
