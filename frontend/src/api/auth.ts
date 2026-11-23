import { apiFetch } from './client';

export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
}

/** 현재 로그인된 사용자 정보를 가져온다. 로그인하지 않았으면 401 `ApiError`를 던진다. */
export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiFetch('/api/auth/me');
  return response.json();
}

/** 현재 세션을 종료한다. */
export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}
