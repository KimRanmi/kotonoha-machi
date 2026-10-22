const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

/** 백엔드가 돌려준 오류 응답(상태 코드 + 메시지)을 담는 에러. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.clone().json();
    if (body && typeof body === 'object' && 'message' in body) {
      const message = (body as { message: unknown }).message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }
  } catch {
    // 응답 본문이 JSON이 아니면 아래 기본 메시지를 쓴다.
  }
  return `요청 실패: ${response.status} ${response.statusText}`;
}

/** 소셜 로그인을 시작하는 백엔드 주소를 만든다. 클릭 시 페이지 전체를 이 주소로 이동시켜야 한다(fetch 아님). */
export function oauth2AuthorizationUrl(provider: 'google' | 'kakao' | 'naver'): string {
  return `${API_BASE_URL}/oauth2/authorization/${provider}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    // 세션 쿠키 기반 인증이라, 교차 출처(프런트엔드↔백엔드) 요청에도 쿠키를 실어 보낸다.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await extractErrorMessage(response));
  }

  return response;
}
