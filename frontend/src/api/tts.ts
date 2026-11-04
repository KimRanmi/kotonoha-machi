import { apiFetch } from './client';

/**
 * 일본어 문장을 읽어주는 음성(MP3)을 백엔드(Google Cloud Text-to-Speech)에서 가져온다. 키가 없거나 하루
 * 합성 횟수를 넘으면 `ApiError`를 던진다.
 */
export async function getSpeechAudio(text: string): Promise<Blob> {
  const response = await apiFetch(`/api/tts?text=${encodeURIComponent(text)}`);
  return response.blob();
}
