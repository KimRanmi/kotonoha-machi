package com.kotonohamachi.user.dto;

import com.kotonohamachi.user.AvatarClothesStyle;
import com.kotonohamachi.user.AvatarHairColor;
import com.kotonohamachi.user.AvatarHairStyle;
import com.kotonohamachi.user.AvatarShoesColor;
import com.kotonohamachi.user.AvatarSkinColor;

/**
 * 프로필(이메일, 닉네임, 캐릭터 꾸미기) 응답 본문.
 *
 * @param id 사용자 ID
 * @param email 이메일
 * @param nickname 닉네임
 * @param hasPassword 비밀번호 로그인 수단이 있는지 여부(소셜 로그인만으로 가입한 계정은 false)
 * @param avatarSkinColor 피부색
 * @param avatarHairColor 머리색
 * @param avatarHairStyle 헤어스타일
 * @param avatarClothesStyle 옷
 * @param avatarShoesColor 신발 색
 */
public record ProfileResponse(
    Long id,
    String email,
    String nickname,
    boolean hasPassword,
    AvatarSkinColor avatarSkinColor,
    AvatarHairColor avatarHairColor,
    AvatarHairStyle avatarHairStyle,
    AvatarClothesStyle avatarClothesStyle,
    AvatarShoesColor avatarShoesColor) {}
