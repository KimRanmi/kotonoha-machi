import { DEFAULT_VILLAGER_ID } from "@/lib/villager";

const CHAT_STORAGE_KEY_BASE = "kotonoha:chat-history";
export const WORDS_STORAGE_KEY = "kotonoha:word-list";
// 테마 학습을 막 끝내고 마을로 넘어가는 중, 아직 배치되지 않은 건물 1건을 잠깐 들고 있는 키.
// town 페이지가 마운트 시 이 값을 읽고 나면 바로 지워서 배치 모드를 한 번만 트리거한다.
export const PENDING_BUILDING_STORAGE_KEY = "kotonoha:pending-building";
// 사용자가 마을 맵에 실제로 배치한 건물 목록(새로고침 후에도 유지).
export const PLACED_BUILDINGS_STORAGE_KEY = "kotonoha:placed-buildings";

// 주민별 누적 대화 횟수(친밀도의 원천 데이터). { [villagerId]: number }
export const INTIMACY_STORAGE_KEY = "kotonoha:intimacy";

// 주민마다 대화 기록을 따로 저장한다. 기존에 저장된 (villagerId 구분 없던 시절의)
// 카페 대화 기록과 호환되도록 기본 주민은 원래 키를 그대로 쓴다.
export function getChatStorageKey(villagerId: string): string {
  return villagerId === DEFAULT_VILLAGER_ID
    ? CHAT_STORAGE_KEY_BASE
    : `${CHAT_STORAGE_KEY_BASE}:${villagerId}`;
}

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
