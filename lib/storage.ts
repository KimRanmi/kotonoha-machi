import { DEFAULT_VILLAGER_ID } from "@/lib/villager";

const CHAT_STORAGE_KEY_BASE = "kotonoha:chat-history";
export const WORDS_STORAGE_KEY = "kotonoha:word-list";

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
