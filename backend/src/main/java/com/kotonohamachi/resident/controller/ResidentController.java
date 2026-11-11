package com.kotonohamachi.resident.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.resident.dto.FriendshipResponse;
import com.kotonohamachi.resident.service.ResidentFriendshipService;
import com.kotonohamachi.user.User;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** 마을 주민에 대한 조회 API. */
@RestController
public class ResidentController {

  private final ResidentFriendshipService friendshipService;

  /**
   * 생성자.
   *
   * @param friendshipService 친밀도 서비스
   */
  public ResidentController(ResidentFriendshipService friendshipService) {
    this.friendshipService = friendshipService;
  }

  /**
   * 모든 주민과의 친밀도를 돌려준다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @return 주민별 친밀도(0~100)
   */
  @GetMapping("/api/residents/friendships")
  public List<FriendshipResponse> friendships(Authentication authentication) {
    User user = AuthPrincipal.resolve(authentication);
    return friendshipService.listLevels(user.getId());
  }
}
