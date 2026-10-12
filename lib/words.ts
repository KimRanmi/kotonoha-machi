import type { LearnedWord } from "@/lib/types";
import { WORDS_STORAGE_KEY, loadFromStorage, saveToStorage } from "@/lib/storage";

// 학습 단어 목록에 단어를 담는다(이미 있으면 건너뜀). 새로 담은 단어를 돌려준다.
// 열려 있는 대화창이 자기 목록을 다시 읽도록 이벤트도 보낸다.
export const WORDS_CHANGED_EVENT = "kotonoha:words-changed";

export function addLearnedWords(words: string[]): string[] {
  const current = loadFromStorage<LearnedWord[]>(WORDS_STORAGE_KEY, []);
  const fresh = words.filter((w, i) => words.indexOf(w) === i && !current.some((c) => c.word === w));
  if (fresh.length === 0) return [];
  const now = Date.now();
  saveToStorage(WORDS_STORAGE_KEY, [...current, ...fresh.map((word) => ({ word, addedAt: now }))]);
  window.dispatchEvent(new Event(WORDS_CHANGED_EVENT));
  return fresh;
}
