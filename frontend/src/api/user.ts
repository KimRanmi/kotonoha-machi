import { apiFetch } from './client';

export type AvatarSkinColor = 'LIGHT' | 'FAIR' | 'TAN' | 'BROWN' | 'DARK';
export type AvatarHairColor = 'BLACK' | 'BROWN' | 'BLONDE' | 'RED' | 'GRAY';
export type AvatarHairStyle =
  'SHORT' | 'BOB' | 'PONYTAIL' | 'AFRO' | 'BRAIDS' | 'CURLY' | 'BUNS' | 'MOHAWK';
export type AvatarClothesStyle =
  'PLAIN' | 'CARDIGAN' | 'SCHOOL_UNIFORM' | 'ONEPIECE' | 'OVERALLS' | 'STRIPES';
export type AvatarClothesColor =
  'CREAM' | 'PINK' | 'CORAL' | 'PEACH' | 'YELLOW' | 'MINT' | 'SKY' | 'LAVENDER';
export type AvatarShoesColor = 'WHITE' | 'PINK' | 'BEIGE' | 'MINT' | 'SKY' | 'LAVENDER';

/** 캐릭터 꾸미기 여섯 축의 선택값. */
export interface Avatar {
  skinColor: AvatarSkinColor;
  hairColor: AvatarHairColor;
  hairStyle: AvatarHairStyle;
  clothesStyle: AvatarClothesStyle;
  clothesColor: AvatarClothesColor;
  shoesColor: AvatarShoesColor;
}

/** 색 선택지 하나. 한글 이름과 색상값('#' 없는 6자리 16진)은 서버가 내려준다. */
export interface ColorOption<T extends string> {
  value: T;
  label: string;
  hex: string;
}

/** 캐릭터 꾸미기 화면에서 고를 수 있는 축별 선택지 전체 목록. */
export interface AvatarOptions {
  skinColors: ColorOption<AvatarSkinColor>[];
  hairColors: ColorOption<AvatarHairColor>[];
  hairStyles: AvatarHairStyle[];
  clothesStyles: AvatarClothesStyle[];
  clothesColors: ColorOption<AvatarClothesColor>[];
  shoesColors: ColorOption<AvatarShoesColor>[];
}

export interface Profile {
  id: number;
  email: string;
  nickname: string;
  hasPassword: boolean;
  avatarSkinColor: AvatarSkinColor;
  avatarHairColor: AvatarHairColor;
  avatarHairStyle: AvatarHairStyle;
  avatarClothesStyle: AvatarClothesStyle;
  avatarClothesColor: AvatarClothesColor;
  avatarShoesColor: AvatarShoesColor;
}

/** 로그인한 사용자 자신의 프로필(이메일, 닉네임)을 가져온다. */
export async function getProfile(): Promise<Profile> {
  const response = await apiFetch('/api/users/me');
  return response.json();
}

/** 로그인한 사용자 자신의 닉네임을 바꾼다. 다른 사용자가 이미 쓰고 있으면 `ApiError`를 던진다. */
export async function updateNickname(nickname: string): Promise<Profile> {
  const response = await apiFetch('/api/users/me/nickname', {
    method: 'PATCH',
    body: JSON.stringify({ nickname }),
  });
  return response.json();
}

/**
 * 로그인한 사용자 자신의 비밀번호를 바꾼다. 이미 비밀번호가 있는 계정은 현재 비밀번호가 틀리면 `ApiError`를
 * 던진다. 비밀번호가 없는(소셜 로그인만으로 가입한) 계정은 `currentPassword`를 빈 문자열로 보내면 된다.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch('/api/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

/**
 * 로그인한 사용자 자신을 탈퇴 처리한다(소프트 삭제). 이미 비밀번호가 있는 계정은 현재 비밀번호가
 * 틀리면 `ApiError`를 던진다. 비밀번호가 없는(소셜 로그인만으로 가입한) 계정은 `currentPassword`를
 * 빈 문자열로 보내면 된다.
 */
export async function withdraw(currentPassword: string): Promise<void> {
  await apiFetch('/api/auth/me', {
    method: 'DELETE',
    body: JSON.stringify({ currentPassword }),
  });
}

/** 캐릭터 꾸미기 화면에서 고를 수 있는 축별 선택지 전체 목록을 가져온다. */
export async function getAvatarOptions(): Promise<AvatarOptions> {
  const response = await apiFetch('/api/users/me/avatar/options');
  return response.json();
}

/** 로그인한 사용자 자신의 캐릭터 꾸미기(피부색/머리색/헤어스타일/옷/신발)를 바꾼다. */
export async function updateAvatar(avatar: Avatar): Promise<Profile> {
  const response = await apiFetch('/api/users/me/avatar', {
    method: 'PATCH',
    body: JSON.stringify(avatar),
  });
  return response.json();
}
