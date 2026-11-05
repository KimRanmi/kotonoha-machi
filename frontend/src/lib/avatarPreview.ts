import type {
  Avatar,
  AvatarOptions,
  AvatarClothesStyle,
  AvatarHairStyle,
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

/** 캐릭터를 그릴 때 쓰는 색상값 모음(축별로 선택지 이름 → '#' 없는 16진 색상값). 서버의 선택지 응답에서 만든다. */
export interface AvatarPalette {
  skin: Record<string, string>;
  hair: Record<string, string>;
  clothes: Record<string, string>;
  shoes: Record<string, string>;
}

function hexByValue(options: { value: string; hex: string }[]): Record<string, string> {
  return Object.fromEntries(options.map((option) => [option.value, option.hex]));
}

export function buildAvatarPalette(options: AvatarOptions): AvatarPalette {
  return {
    skin: hexByValue(options.skinColors),
    hair: hexByValue(options.hairColors),
    clothes: hexByValue(options.clothesColors),
    shoes: hexByValue(options.shoesColors),
  };
}
