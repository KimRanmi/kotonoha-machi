import type {
  Avatar,
  AvatarClothesColor,
  AvatarClothesStyle,
  AvatarHairColor,
  AvatarHairStyle,
  AvatarShoesColor,
  AvatarSkinColor,
  Profile,
} from '../api/user';

/** 프로필 응답에서 캐릭터 꾸미기 여섯 축만 뽑아낸다. */
export function avatarFromProfile(profile: Profile): Avatar {
  return {
    skinColor: profile.avatarSkinColor,
    hairColor: profile.avatarHairColor,
    hairStyle: profile.avatarHairStyle,
    clothesStyle: profile.avatarClothesStyle,
    clothesColor: profile.avatarClothesColor,
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

export const CLOTHES_COLOR_LABELS: Record<AvatarClothesColor, string> = {
  WHITE: '흰색',
  BLACK: '검정',
  RED: '빨강',
  PINK: '분홍',
  ORANGE: '주황',
  YELLOW: '노랑',
  GREEN: '초록',
  MINT: '민트',
  SKY: '하늘',
  BLUE: '파랑',
  PURPLE: '보라',
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

export const CLOTHES_COLOR_HEX: Record<AvatarClothesColor, string> = {
  WHITE: 'f4f1ec',
  BLACK: '3a3a42',
  RED: 'e5534b',
  PINK: 'f4a3b8',
  ORANGE: 'f4a259',
  YELLOW: 'f7d65a',
  GREEN: '7fc97f',
  MINT: '9fe0c8',
  SKY: '7db9e8',
  BLUE: '4a6fd0',
  PURPLE: 'a98bd8',
};

export const SHOES_COLOR_HEX: Record<AvatarShoesColor, string> = {
  WHITE: 'ffffff',
  BLACK: '000000',
  BROWN: '6b4423',
  RED: 'c0392b',
  BLUE: '2e4a8e',
};
