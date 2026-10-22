import { apiFetch } from './client';

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
}

/** 이메일, 비밀번호, 닉네임으로 회원가입을 시작한다. 가입 완료에는 이메일 인증이 더 필요하다. */
export async function signup(request: SignupRequest): Promise<void> {
  await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/** 닉네임 중복 여부를 확인한다. */
export async function checkNicknameAvailability(nickname: string): Promise<boolean> {
  const response = await apiFetch(
    `/api/auth/nickname-check?nickname=${encodeURIComponent(nickname)}`,
  );
  const body: { available: boolean } = await response.json();
  return body.available;
}

/** 이메일로 받은 인증 코드를 확인하고 가입을 완료한다. */
export async function verifyEmail(request: VerifyEmailRequest): Promise<void> {
  await apiFetch('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/** 인증 코드를 다시 보낸다. 코드가 만료되었거나 메일을 못 받았을 때 쓴다. */
export async function resendVerificationCode(email: string): Promise<void> {
  await apiFetch('/api/auth/verify-email/resend', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** 이메일/비밀번호로 로그인하고 세션을 발급받는다. */
export async function login(request: LoginRequest): Promise<AuthUser> {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return response.json();
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

export interface ConfirmPasswordResetRequest {
  email: string;
  code: string;
  newPassword: string;
}

/** 비밀번호 재설정 코드를 요청한다. 가입 여부와 상관없이 항상 성공한다. */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch('/api/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** 비밀번호 재설정 코드를 확인하고 비밀번호를 바꾼다. */
export async function confirmPasswordReset(request: ConfirmPasswordResetRequest): Promise<void> {
  await apiFetch('/api/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
