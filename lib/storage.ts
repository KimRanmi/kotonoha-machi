import type { ChatMessage } from "@/lib/types";

export const WORDS_STORAGE_KEY = "kotonoha:word-list";
// 테마 학습을 막 끝내고 마을로 넘어가는 중, 아직 배치되지 않은 건물 1건을 잠깐 들고 있는 키.
// town 페이지가 마운트 시 이 값을 읽고 나면 바로 지워서 배치 모드를 한 번만 트리거한다.
export const PENDING_BUILDING_STORAGE_KEY = "kotonoha:pending-building";
// 사용자가 마을 맵에 실제로 배치한 건물 목록(새로고침 후에도 유지).
export const PLACED_BUILDINGS_STORAGE_KEY = "kotonoha:placed-buildings";

// 로그인 도입(3단계) 전까지 사용자를 식별하는 익명 ID. 처음 한 번 만들어 localStorage에 두고
// 모든 API 요청에 X-Anonymous-Id 헤더로 보낸다 (서버가 이 값으로 users 행을 연결한다).
const ANONYMOUS_ID_STORAGE_KEY = "kotonoha:anonymous-id";

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 사용이 불가능한 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // localStorage 사용이 불가능한 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}

function getAnonymousId(): string {
  const existing = loadFromStorage<string>(ANONYMOUS_ID_STORAGE_KEY, "");
  if (existing) return existing;
  const id = crypto.randomUUID();
  saveToStorage(ANONYMOUS_ID_STORAGE_KEY, id);
  return id;
}

// ---- 서버(API) 기반 저장소: 대화 기록 / 친밀도 ----
// 화면 코드는 fetch를 직접 쓰지 않고 아래 함수들만 사용한다.
// 3단계에서 로그인이 붙으면 apiFetch의 인증 헤더만 바꾸면 된다.

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...init.headers,
      "X-Anonymous-Id": getAnonymousId(),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
}

async function readJson<T>(res: Response, fallbackError: string): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || fallbackError);
  return data as T;
}

export interface ChatReply {
  reply: string;
  translation: string;
}

// 주민별 대화 기록 (오래된 순).
export async function fetchChatHistory(villagerId: string): Promise<ChatMessage[]> {
  const res = await apiFetch(`/api/villagers/${encodeURIComponent(villagerId)}/messages`);
  return readJson<ChatMessage[]>(res, "대화 기록을 불러오지 못했습니다.");
}

// 대화를 보내고 주민의 답변을 받는다. 저장과 친밀도 증가는 서버가 처리한다.
export async function sendChat(
  villagerId: string,
  messages: { role: string; content: string }[],
): Promise<ChatReply> {
  const res = await apiFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ villagerId, messages }),
  });
  return readJson<ChatReply>(res, "알 수 없는 오류가 발생했습니다.");
}

// 주민별 친밀도 서술형 문구. 아직 만난 적 없으면 met=false, description=null.
export interface VillagerIntimacy {
  villagerId: string;
  met: boolean;
  description: string | null;
}

export async function fetchIntimacy(): Promise<VillagerIntimacy[]> {
  const res = await apiFetch("/api/intimacy");
  return readJson<VillagerIntimacy[]>(res, "친밀도를 불러오지 못했습니다.");
}
