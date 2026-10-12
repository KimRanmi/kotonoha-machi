import { addWord, fetchWords } from "@/lib/storage";

// 학습 단어 목록(서버)에 단어를 담는다. 이미 있으면 건너뛰고, 새로 담은 단어를 돌려준다.
// 저장에 실패하면(오프라인 등) 학습을 방해하지 않도록 조용히 건너뛴다.
// 열려 있는 대화창이 자기 목록을 다시 읽도록 이벤트도 보낸다.
export const WORDS_CHANGED_EVENT = "kotonoha:words-changed";

export async function addLearnedWords(words: string[]): Promise<string[]> {
  try {
    const current = await fetchWords();
    const fresh = words.filter((w, i) => words.indexOf(w) === i && !current.some((c) => c.word === w));
    for (const w of fresh) await addWord(w);
    if (fresh.length) window.dispatchEvent(new Event(WORDS_CHANGED_EVENT));
    return fresh;
  } catch {
    return [];
  }
}
