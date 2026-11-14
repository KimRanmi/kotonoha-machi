import { getSpeechAudio } from '../api/tts';

/** 이 브라우저가 음성 합성(텍스트 읽어 주기)을 지원하는지 확인한다. */
function isBrowserVoiceSupported(): boolean {
  return 'speechSynthesis' in window;
}

/** 브라우저 내장 음성의 높낮이(pitch, 0~2)와 속도(rate)로 만드는 목소리. 주민마다 다르게 준다. */
export interface VoiceProfile {
  pitch: number;
  rate: number;
}

/** 브라우저 내장 음성의 속도. 학습용이라 기본(1.0)보다 천천히 읽는다. */
const BROWSER_VOICE_RATE = 0.75;

/** 서버 음성은 기본 속도가 학습용으로 빠른 편이라 조금 느리게 재생한다. */
const AUDIO_PLAYBACK_RATE = 0.9;

/** 직전 재생을 끊은 뒤 새로 읽기 시작하기까지 기다리는 시간(ms). 바로 이어 읽으면 앞부분이 먹히기도 한다. */
const RESTART_DELAY_MS = 80;

/**
 * 재생 중인 브라우저 발화를 붙잡아 둔다. Chrome은 아무도 참조하지 않는 발화를 재생 도중 가비지 컬렉션해서
 * 말 끝이 잘리는 문제가 있어서, 끝날 때까지 변수에 들고 있는다.
 */
let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;
let restartTimer: number | null = null;

/** 가장 최근에 읽으라고 요청한 번호. 기다리는 사이 다른 요청이 들어오면 오래된 요청은 재생하지 않는다. */
let latestRequestId = 0;

/**
 * 문장별 서버 음성 주소를 기억한다. 값 대신 진행 중인 요청(Promise)을 넣어 두어서, 같은 문장을 빠르게 두 번
 * 눌러도 서버에 한 번만 묻는다. 실패한 요청은 다음에 다시 시도할 수 있게 지운다.
 */
const audioUrlCache = new Map<string, Promise<string>>();

/** 재생 중이거나 재생 예정인 음성을 모두 멈춘다. 페이지를 떠나거나 다음 문제로 넘어갈 때 쓴다. */
export function stopSpeaking(): void {
  latestRequestId += 1;
  if (restartTimer !== null) {
    window.clearTimeout(restartTimer);
    restartTimer = null;
  }
  currentAudio?.pause();
  currentAudio = null;
  currentUtterance = null;
  if (isBrowserVoiceSupported()) {
    window.speechSynthesis.cancel();
  }
}

/** 서버 음성에서 목소리를 정할 주민. 성별은 서버가 주민의 slug로 찾는다. */
export interface ResidentSpeaker {
  slug: string;
  voice: VoiceProfile;
}

/** 브라우저에 내장된 음성으로 읽어 준다. 서버 음성을 쓸 수 없을 때 대신 쓴다. */
function speakWithBrowserVoice(text: string, voice?: VoiceProfile): void {
  if (!isBrowserVoiceSupported()) {
    return;
  }

  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = voice?.rate ?? BROWSER_VOICE_RATE;
  utterance.pitch = voice?.pitch ?? 1;
  const clearCurrent = () => {
    if (currentUtterance === utterance) {
      currentUtterance = null;
    }
  };
  utterance.onend = clearCurrent;
  utterance.onerror = clearCurrent;
  currentUtterance = utterance;

  if (synthesis.speaking || synthesis.pending) {
    synthesis.cancel();
    restartTimer = window.setTimeout(() => {
      restartTimer = null;
      // 기다리는 사이 다른 읽기가 시작되거나 멈췄다면 이 발화는 읽지 않는다.
      if (currentUtterance === utterance) {
        synthesis.speak(utterance);
      }
    }, RESTART_DELAY_MS);
  } else {
    synthesis.speak(utterance);
  }
}

function loadAudioUrl(text: string, speaker?: ResidentSpeaker): Promise<string> {
  // 같은 문장도 주민마다 목소리가 달라 주민까지 넣어 기억한다.
  const cacheKey = speaker ? `${speaker.slug}\n${text}` : text;
  const cached = audioUrlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = getSpeechAudio(
    text,
    speaker && {
      residentSlug: speaker.slug,
      pitch: speaker.voice.pitch,
      rate: speaker.voice.rate,
    },
  ).then((blob) => URL.createObjectURL(blob));
  audioUrlCache.set(cacheKey, request);
  request.catch(() => audioUrlCache.delete(cacheKey));
  return request;
}

/**
 * 텍스트를 일본어 음성으로 읽어 준다. 백엔드의 Google 음성을 우선 쓰고, 받아오지 못하면(키 없음, 횟수
 * 초과, 로그인 만료, 네트워크 오류 등) 브라우저 내장 음성으로 대신 읽는다. 새로 읽기 시작하면 재생 중인
 * 음성은 끊긴다.
 *
 * `speaker`(주민)를 주면 그 주민의 성별에 맞는 서버 음성에 주민의 높낮이·속도를 적용해 읽는다. 서버 음성을
 * 쓰지 못하면 브라우저 내장 음성에 같은 높낮이·속도를 적용해 대신 읽는다.
 */
export function speakJapanese(text: string, speaker?: ResidentSpeaker): void {
  stopSpeaking();
  const requestId = latestRequestId;

  loadAudioUrl(text, speaker)
    .then((url) => {
      // 기다리는 사이 다른 문장을 눌렀거나 멈췄다면 이 음성은 재생하지 않는다.
      if (requestId !== latestRequestId) {
        return;
      }
      const audio = new Audio(url);
      // 주민 음성은 서버에서 이미 속도를 맞춰 합성했으니 다시 늦추지 않는다.
      audio.playbackRate = speaker ? 1 : AUDIO_PLAYBACK_RATE;
      currentAudio = audio;
      return audio.play();
    })
    .catch((error: unknown) => {
      console.warn('서버 음성을 쓰지 못해 브라우저 음성으로 대신합니다.', error);
      if (requestId === latestRequestId) {
        speakWithBrowserVoice(text, speaker?.voice);
      }
    });
}
