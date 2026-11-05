package com.kotonohamachi.user.dto;

import com.kotonohamachi.user.AvatarClothesColor;
import com.kotonohamachi.user.AvatarClothesStyle;
import com.kotonohamachi.user.AvatarHairColor;
import com.kotonohamachi.user.AvatarHairStyle;
import com.kotonohamachi.user.AvatarShoesColor;
import com.kotonohamachi.user.AvatarSkinColor;
import java.util.List;

/**
 * 캐릭터 꾸미기 화면에서 고를 수 있는 선택지 전체 목록. 프런트엔드가 축별 값 목록을 직접 하드코딩하지 않고 이 응답을
 * 기준으로 그리게 해서, 서버와 화면이 서로 다른 값을 쓰는 상황을 막는다.
 *
 * @param skinColors 고를 수 있는 피부색 목록
 * @param hairColors 고를 수 있는 머리색 목록
 * @param hairStyles 고를 수 있는 헤어스타일 목록
 * @param clothesStyles 고를 수 있는 옷 목록
 * @param clothesColors 고를 수 있는 옷 색 목록
 * @param shoesColors 고를 수 있는 신발 색 목록
 */
public record AvatarOptionsResponse(
    List<AvatarSkinColor> skinColors,
    List<AvatarHairColor> hairColors,
    List<AvatarHairStyle> hairStyles,
    List<AvatarClothesStyle> clothesStyles,
    List<AvatarClothesColor> clothesColors,
    List<AvatarShoesColor> shoesColors) {}
