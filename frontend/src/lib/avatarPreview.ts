import type {
  Avatar,
  AvatarClothesStyle,
  AvatarHairColor,
  AvatarHairStyle,
  AvatarShoesColor,
  AvatarSkinColor,
  Profile,
} from '../api/user';

/** 프로필 응답에서 캐릭터 꾸미기 다섯 축만 뽑아낸다. */
export function avatarFromProfile(profile: Profile): Avatar {
  return {
    skinColor: profile.avatarSkinColor,
    hairColor: profile.avatarHairColor,
    hairStyle: profile.avatarHairStyle,
    clothesStyle: profile.avatarClothesStyle,
    shoesColor: profile.avatarShoesColor,
  };
}

export const SKIN_COLOR_LABELS: Record<AvatarSkinColor, string> = {
  LIGHT: '연한',
  FAIR: '밝은',
  TAN: '구릿빛',
  BROWN: '갈색',
  DARK: '어두운',
};

export const HAIR_COLOR_LABELS: Record<AvatarHairColor, string> = {
  BLACK: '흑발',
  BROWN: '갈색',
  BLONDE: '금발',
  RED: '빨강',
  GRAY: '은발',
};

export const HAIR_STYLE_LABELS: Record<AvatarHairStyle, string> = {
  SHORT: '숏컷',
  BOB: '단발',
  PONYTAIL: '포니테일',
  AFRO: '아프로',
  BRAIDS: '브레이드',
  CURLY: '곱슬',
  BUNS: '번머리',
  MOHAWK: '모히칸',
};

export const CLOTHES_STYLE_LABELS: Record<AvatarClothesStyle, string> = {
  PLAIN: '기본',
  HOODIE: '후드티',
  JACKET: '재킷',
  COAT: '코트',
  SUIT: '수트',
  DRESS: '드레스',
  OVERALLS: '오버올',
  STRIPES: '스트라이프',
  CHECKER: '체크',
  TIE: '넥타이',
};

export const SHOES_COLOR_LABELS: Record<AvatarShoesColor, string> = {
  WHITE: '흰색',
  BLACK: '검정',
  BROWN: '갈색',
  RED: '빨강',
  BLUE: '파랑',
};

export const SKIN_COLOR_HEX: Record<AvatarSkinColor, string> = {
  LIGHT: 'ffdbb4',
  FAIR: 'edb98a',
  TAN: 'd08b5b',
  BROWN: 'ae5d29',
  DARK: '614335',
};

export const HAIR_COLOR_HEX: Record<AvatarHairColor, string> = {
  BLACK: '2c1b18',
  BROWN: '724133',
  BLONDE: 'd6b370',
  RED: 'a55728',
  GRAY: 'cccccc',
};

export const SHOES_COLOR_HEX: Record<AvatarShoesColor, string> = {
  WHITE: 'ffffff',
  BLACK: '000000',
  BROWN: '6b4423',
  RED: 'c0392b',
  BLUE: '2e4a8e',
};

/**
 * 색상 축(피부색/머리색/신발 색)은 우리 쪽 enum 이름을 미리 정한 16진 색상값으로 매핑하고, 스타일 축
 * (헤어스타일/옷)은 DiceBear voxel-art의 파라미터 값과 이름이 같아 소문자로만 바꾼다. 이렇게 저장 데이터와
 * 렌더링 서비스를 분리해두면, 나중에 DiceBear가 아닌 다른 서비스로 바꿀 때도 이 파일만 고치면 된다.
 */
export function buildAvatarPreviewUrl(avatar: Avatar, seed: string): string {
  const params = new URLSearchParams({
    seed,
    skinColor: SKIN_COLOR_HEX[avatar.skinColor],
    hairColor: HAIR_COLOR_HEX[avatar.hairColor],
    topVariant: avatar.hairStyle.toLowerCase(),
    outfitVariant: avatar.clothesStyle.toLowerCase(),
    shoesColor: SHOES_COLOR_HEX[avatar.shoesColor],
  });
  return `https://api.dicebear.com/10.x/voxel-art/svg?${params.toString()}`;
}
