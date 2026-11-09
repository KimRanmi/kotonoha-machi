import { apiFetch } from './client';

/** 주민의 대답. 일본어 대사와 한국어 번역이 함께 온다. */
export interface ChatReply {
  reply: string;
  translation: string;
}

/** 주민(slug, 예: r01)에게 말을 걸고 대답을 받는다. */
export async function sendChatMessage(residentSlug: string, message: string): Promise<ChatReply> {
  const response = await apiFetch(`/api/residents/${encodeURIComponent(residentSlug)}/chat`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return response.json();
}
