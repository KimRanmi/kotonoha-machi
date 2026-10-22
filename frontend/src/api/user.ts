import { apiFetch } from './client';

export interface Profile {
  id: number;
  email: string;
  nickname: string;
  hasPassword: boolean;
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
