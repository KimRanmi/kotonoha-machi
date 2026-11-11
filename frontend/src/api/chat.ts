import { apiFetch } from './client';

/** 주민의 대답. 일본어 대사와 한국어 번역, 대화 뒤의 친밀도가 함께 온다. */
export interface ChatReply {
  reply: string;
  translation: string;
  /** 대화 뒤의 친밀도(0~100). */
  friendshipLevel: number;
  /** 이번 대화로 오른 친밀도. 하루 한도에 막히면 0. */
  friendshipGain: number;
}

/** 주민(slug, 예: r01)에게 말을 걸고 대답을 받는다. */
export async function sendChatMessage(residentSlug: string, message: string): Promise<ChatReply> {
  const response = await apiFetch(`/api/residents/${encodeURIComponent(residentSlug)}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return response.json();
}

/** 저장된 대화 한 줄. 주민 대사에만 한국어 번역이 있다. */
export interface ChatHistoryItem {
  speaker: 'PLAYER' | 'RESIDENT';
  text: string;
  translation: string | null;
}

/** 주민(slug)과 나눈 최근 대화를 오래된 순으로 가져온다. */
export async function getChatHistory(residentSlug: string): Promise<ChatHistoryItem[]> {
  const response = await apiFetch(`/api/residents/${encodeURIComponent(residentSlug)}/chat`);
  return response.json();
}
