package com.kotonohamachi.user.dto;

import com.kotonohamachi.user.AvatarClothesStyle;
import com.kotonohamachi.user.AvatarHairColor;
import com.kotonohamachi.user.AvatarHairStyle;
import com.kotonohamachi.user.AvatarShoesColor;
import com.kotonohamachi.user.AvatarSkinColor;
import jakarta.validation.constraints.NotNull;

/**
 * 캐릭터 꾸미기 변경 요청 본문. 다섯 축 모두 값이 있어야 한다(일부만 바꾸는 부분 수정은 지원하지 않는다).
 *
 * @param skinColor 피부색
 * @param hairColor 머리색
 * @param hairStyle 헤어스타일
 * @param clothesStyle 옷
 * @param shoesColor 신발 색
 */
public record UpdateAvatarRequest(
    @NotNull(message = "피부색을 선택해주세요.") AvatarSkinColor skinColor,
    @NotNull(message = "머리색을 선택해주세요.") AvatarHairColor hairColor,
    @NotNull(message = "헤어스타일을 선택해주세요.") AvatarHairStyle hairStyle,
    @NotNull(message = "옷을 선택해주세요.") AvatarClothesStyle clothesStyle,
    @NotNull(message = "신발 색을 선택해주세요.") AvatarShoesColor shoesColor) {}
