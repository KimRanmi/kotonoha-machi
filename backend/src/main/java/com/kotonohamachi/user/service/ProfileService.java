package com.kotonohamachi.user.service;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.common.PasswordVerifier;
import com.kotonohamachi.user.AvatarClothesColor;
import com.kotonohamachi.user.AvatarClothesStyle;
import com.kotonohamachi.user.AvatarHairColor;
import com.kotonohamachi.user.AvatarHairStyle;
import com.kotonohamachi.user.AvatarShoesColor;
import com.kotonohamachi.user.AvatarSkinColor;
import com.kotonohamachi.user.User;
import com.kotonohamachi.user.UserErrorCode;
import com.kotonohamachi.user.dto.AvatarOptionsResponse;
import com.kotonohamachi.user.dto.ProfileResponse;
import com.kotonohamachi.user.repository.UserRepository;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 로그인한 사용자의 프로필 조회/닉네임 변경을 처리한다. 세션에는 로그인 시점에 읽어온 {@link User} 인스턴스가
 * {@code Authentication} principal로 캐시되어 있어, 닉네임을 바꾼 뒤 같은 세션에서 principal을 그대로 쓰면 바뀌기
 * 전 값이 보인다. 그래서 조회도 호출마다 {@link UserRepository}로 다시 읽어 최신 값을 돌려준다.
 */
@Service
public class ProfileService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;

  /**
   * 생성자.
   *
   * @param userRepository 사용자 저장소
   * @param passwordEncoder 비밀번호 해싱/검증기
   */
  public ProfileService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  /**
   * 사용자의 현재 프로필을 조회한다. DB를 다시 읽어 최신 값을 돌려준다.
   *
   * @param userId 조회할 사용자 ID(로그인한 본인)
   * @return 현재 프로필 정보
   */
  @Transactional(readOnly = true)
  public ProfileResponse getProfile(Long userId) {
    User user = findUserOrThrow(userId);
    return toProfileResponse(user);
  }

  /**
   * 닉네임을 바꾼다. 본인의 현재 닉네임과 같은 값으로 요청하면 중복 에러 없이 그대로 성공 처리한다.
   *
   * @param userId 닉네임을 바꿀 사용자 ID(로그인한 본인)
   * @param nickname 새 닉네임
   * @return 변경된 프로필 정보
   */
  @Transactional
  public ProfileResponse updateNickname(Long userId, String nickname) {
    User user = findUserOrThrow(userId);

    boolean nicknameIsUnchanged = user.getNickname().equals(nickname);
    if (!nicknameIsUnchanged && userRepository.existsByNickname(nickname)) {
      throw new ApiException(UserErrorCode.NICKNAME_ALREADY_IN_USE);
    }

    user.changeNickname(nickname);
    return toProfileResponse(user);
  }

  /**
   * 로그인한 본인의 비밀번호를 바꾼다. 이미 비밀번호가 있는 계정은 현재 비밀번호가 맞는지 먼저 확인하고,
   * 소셜 로그인만으로 가입해 비밀번호가 없는 계정은 확인 없이 새 비밀번호를 설정한다.
   *
   * @param userId 비밀번호를 바꿀 사용자 ID(로그인한 본인)
   * @param currentPassword 현재 비밀번호(비밀번호가 없는 계정은 비워서 보낼 수 있다)
   * @param newPassword 새로 설정할 비밀번호
   */
  @Transactional
  public void changePassword(Long userId, String currentPassword, String newPassword) {
    User user = findUserOrThrow(userId);

    if (user.getPasswordHash() != null
        && !PasswordVerifier.matches(passwordEncoder, user.getPasswordHash(), currentPassword)) {
      throw new ApiException(UserErrorCode.CURRENT_PASSWORD_MISMATCH);
    }

    user.changePassword(passwordEncoder.encode(newPassword));
  }

  /**
   * 캐릭터 꾸미기(피부색/머리색/헤어스타일/옷/신발)를 바꾼다.
   *
   * @param userId 꾸미기를 바꿀 사용자 ID(로그인한 본인)
   * @param skinColor 피부색
   * @param hairColor 머리색
   * @param hairStyle 헤어스타일
   * @param clothesStyle 옷
   * @param clothesColor 옷 색
   * @param shoesColor 신발 색
   * @return 변경된 프로필 정보
   */
  @Transactional
  public ProfileResponse updateAvatar(
      Long userId,
      AvatarSkinColor skinColor,
      AvatarHairColor hairColor,
      AvatarHairStyle hairStyle,
      AvatarClothesStyle clothesStyle,
      AvatarClothesColor clothesColor,
      AvatarShoesColor shoesColor) {
    User user = findUserOrThrow(userId);
    user.updateAvatar(skinColor, hairColor, hairStyle, clothesStyle, clothesColor, shoesColor);
    return toProfileResponse(user);
  }

  /**
   * 캐릭터 꾸미기 화면에서 고를 수 있는 선택지 전체 목록을 반환한다. 사용자마다 다르지 않은 고정된 목록이다.
   *
   * @return 축별 선택지 목록
   */
  public AvatarOptionsResponse getAvatarOptions() {
    return new AvatarOptionsResponse(
        List.of(AvatarSkinColor.values()),
        List.of(AvatarHairColor.values()),
        List.of(AvatarHairStyle.values()),
        List.of(AvatarClothesStyle.values()),
        List.of(AvatarClothesColor.values()),
        List.of(AvatarShoesColor.values()));
  }

  private User findUserOrThrow(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new IllegalStateException("로그인한 사용자를 찾을 수 없습니다."));
  }

  private ProfileResponse toProfileResponse(User user) {
    return new ProfileResponse(
        user.getId(),
        user.getEmail(),
        user.getNickname(),
        user.getPasswordHash() != null,
        user.getAvatarSkinColor(),
        user.getAvatarHairColor(),
        user.getAvatarHairStyle(),
        user.getAvatarClothesStyle(),
        user.getAvatarClothesColor(),
        user.getAvatarShoesColor());
  }
}
