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

/** 단어장 레벨 탭. `OTHER`는 N4·N5와 레벨을 모르는 단어다. */
export type VocabularyLevel = 'N1' | 'N2' | 'N3' | 'OTHER';

/** 단어장 한 페이지 분량. `page`는 0부터 시작한다. */
export interface VocabularyPageResult {
  items: VocabularyEntry[];
  page: number;
  totalPages: number;
  totalElements: number;
}

/** 로그인한 사용자 본인의 단어장을 레벨별로 최근 저장한 순서대로 한 페이지 가져온다. */
export async function getVocabulary(
  level: VocabularyLevel,
  page: number,
): Promise<VocabularyPageResult> {
  const params = new URLSearchParams({ level, page: String(page) });
  const response = await apiFetch(`/api/vocabulary?${params}`);
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
