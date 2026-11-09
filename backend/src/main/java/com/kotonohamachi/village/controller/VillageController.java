package com.kotonohamachi.village.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.user.User;
import com.kotonohamachi.village.dto.VillageBuildingResponse;
import com.kotonohamachi.village.dto.VillagePositionRequest;
import com.kotonohamachi.village.dto.VillagePositionResponse;
import com.kotonohamachi.village.service.VillageService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 마을 건물의 열림 상태와 마지막 위치 조회·저장 API. */
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
    AuthPrincipal.resolve(authentication);
    return villageService.getBuildings();
  }

  /**
   * 로그인한 사용자가 마을에서 마지막으로 서 있던 자리를 조회한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @return 마지막 자리. 저장한 적이 없으면 x, z 모두 null
   */
  @GetMapping("/api/village/position")
  public VillagePositionResponse getPosition(Authentication authentication) {
    User user = AuthPrincipal.resolve(authentication);
    return villageService.getPosition(user.getId());
  }

  /**
   * 로그인한 사용자가 마을에서 서 있는 자리를 저장한다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param request 저장할 좌표
   * @return 본문 없는 204 응답
   */
  @PutMapping("/api/village/position")
  public ResponseEntity<Void> savePosition(
      Authentication authentication, @Valid @RequestBody VillagePositionRequest request) {
    User user = AuthPrincipal.resolve(authentication);
    villageService.savePosition(user.getId(), request.x(), request.z());
    return ResponseEntity.noContent().build();
  }
}
