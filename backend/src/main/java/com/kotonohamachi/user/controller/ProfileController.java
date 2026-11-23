package com.kotonohamachi.user.controller;

import com.kotonohamachi.auth.service.AuthPrincipal;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.dto.AvatarOptionsResponse;
import com.kotonohamachi.user.dto.ProfileResponse;
import com.kotonohamachi.user.dto.UpdateAvatarRequest;
import com.kotonohamachi.user.dto.UpdateNicknameRequest;
import com.kotonohamachi.user.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 로그인한 사용자 자신의 프로필(이메일, 닉네임) 조회/수정, 캐릭터 꾸미기 조회/변경 API. */
@RestController
public class ProfileController {

  private final ProfileService profileService;

  /**
   * 생성자.
   *
   * @param profileService 프로필·닉네임·캐릭터 꾸미기 서비스
   */
  public ProfileController(ProfileService profileService) {
    this.profileService = profileService;
  }

  /**
   * 로그인한 사용자 자신의 프로필(이메일, 닉네임)을 조회한다. 세션에 캐시된 인증 정보가 아니라 DB를 다시 읽어서
   * 반환한다({@link ProfileService} 참고) — 그래야 닉네임을 바꾼 뒤 같은 세션에서 바로 조회해도 최신 값이 보인다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @return 현재 사용자의 프로필 정보
   */
  @GetMapping("/api/users/me")
  public ProfileResponse me(Authentication authentication) {
    User user = AuthPrincipal.resolve(authentication);
    return profileService.getProfile(user.getId());
  }

  /**
   * 로그인한 사용자 자신의 닉네임을 바꾼다. 다른 사용자가 이미 쓰고 있는 닉네임으로는 바꿀 수 없다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param request 닉네임 변경 요청 본문
   * @return 변경된 프로필 정보
   */
  @PatchMapping("/api/users/me/nickname")
  public ProfileResponse updateNickname(
      Authentication authentication, @Valid @RequestBody UpdateNicknameRequest request) {
    User user = AuthPrincipal.resolve(authentication);
    return profileService.updateNickname(user.getId(), request.nickname());
  }

  /**
   * 캐릭터 꾸미기 화면에서 고를 수 있는 선택지 전체 목록을 조회한다.
   *
   * @return 축별 선택지 목록
   */
  @GetMapping("/api/users/me/avatar/options")
  public AvatarOptionsResponse avatarOptions() {
    return profileService.getAvatarOptions();
  }

  /**
   * 로그인한 사용자 자신의 캐릭터 꾸미기(피부색/머리색/헤어스타일/옷/신발)를 바꾼다.
   *
   * @param authentication 현재 요청의 인증 정보
   * @param request 캐릭터 꾸미기 변경 요청 본문
   * @return 변경된 프로필 정보
   */
  @PatchMapping("/api/users/me/avatar")
  public ProfileResponse updateAvatar(
      Authentication authentication, @Valid @RequestBody UpdateAvatarRequest request) {
    User user = AuthPrincipal.resolve(authentication);
    return profileService.updateAvatar(
        user.getId(),
        request.skinColor(),
        request.hairColor(),
        request.hairStyle(),
        request.clothesStyle(),
        request.clothesColor(),
        request.shoesColor());
  }
}
