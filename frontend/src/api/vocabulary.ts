import { apiFetch } from './client';

/** 단어장에 저장된 단어 하나. `jlptLevel`은 5=N5 ~ 1=N1이고 모르면 `null`이다. */
export interface VocabularyEntry {
  id: number;
  surfaceForm: string;
  reading: string;
  meaning: string;
  jlptLevel: number | null;
  source: 'THEME' | 'CHAT';
  savedAt: string;
}

/** 로그인한 사용자 본인의 단어장을 최근 저장한 순서로 가져온다. */
export async function getVocabulary(): Promise<VocabularyEntry[]> {
  const response = await apiFetch('/api/vocabulary');
  return response.json();
}

/** 대화에서 고른 단어를 저장한 결과. 이미 단어장에 있었다면 `alreadySaved`가 true다. */
export interface SaveChatWordResult {
  alreadySaved: boolean;
  entry: VocabularyEntry;
}

/** 대화에서 드래그해 고른 단어를 사전에서 찾아 단어장에 저장한다. 사전에 없으면 404(ApiError)다. */
export async function saveChatWord(word: string): Promise<SaveChatWordResult> {
  const response = await apiFetch('/api/vocabulary/chat', {
    method: 'POST',
    body: JSON.stringify({ word }),
  });
  return response.json();
}
