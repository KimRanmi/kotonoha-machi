import { apiFetch } from './client';

/**
 * 일본어 문장을 읽어주는 음성(MP3)을 백엔드(Google Cloud Text-to-Speech)에서 가져온다. 키가 없거나 하루
 * 합성 횟수를 넘으면 `ApiError`를 던진다. 주민(slug)을 주면 그 주민의 성별에 맞는 목소리로, 높낮이(pitch)·
 * 속도(rate)를 주면 그대로 적용해 합성한다.
 */
export async function getSpeechAudio(
  text: string,
  speaker?: { residentSlug: string; pitch: number; rate: number },
): Promise<Blob> {
  const params = new URLSearchParams({ text });
  if (speaker) {
    params.set('resident', speaker.residentSlug);
    params.set('pitch', String(speaker.pitch));
    params.set('rate', String(speaker.rate));
  }
  const response = await apiFetch(`/api/tts?${params.toString()}`);
  return response.blob();
}
