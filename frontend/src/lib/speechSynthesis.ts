import { getSpeechAudio } from '../api/tts';

/** 이 브라우저가 음성 합성(텍스트 읽어 주기)을 지원하는지 확인한다. */
export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

/** 학습용이라 기본(1.0)보다 천천히 읽는다. */
const SPEECH_RATE = 0.75;

/**
 * 재생 중인 발화를 붙잡아 둔다. Chrome은 아무도 참조하지 않는 발화를 재생 도중 가비지 컬렉션해서 말 끝이
 * 잘리는 문제가 있어서, 끝날 때까지 변수에 들고 있는다.
 */
let currentUtterance: SpeechSynthesisUtterance | null = null;

/** 직전 재생을 끊은 뒤 새로 읽기 시작하기까지 기다리는 시간(ms). 바로 이어 읽으면 앞부분이 먹히기도 한다. */
const RESTART_DELAY_MS = 80;

/** 브라우저에 내장된 음성으로 읽어 준다. 서버 음성을 쓸 수 없을 때 대신 쓴다. */
function speakWithBrowserVoice(text: string): void {
  if (!isSpeechSynthesisSupported()) {
    return;
  }

  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = SPEECH_RATE;
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
    window.setTimeout(() => synthesis.speak(utterance), RESTART_DELAY_MS);
  } else {
    synthesis.speak(utterance);
  }
}

/** 서버 음성은 기본 속도가 학습용으로 빠른 편이라 조금 느리게 재생한다. */
const AUDIO_PLAYBACK_RATE = 0.9;

/** 한 번 받은 문장의 음성 주소를 기억해, 같은 문장을 다시 들을 때 서버에 다시 묻지 않는다. */
const audioUrlCache = new Map<string, string>();
let currentAudio: HTMLAudioElement | null = null;
let latestRequestId = 0;

/**
 * 텍스트를 일본어 음성으로 읽어 준다. 백엔드의 Google 음성을 우선 쓰고, 받아오지 못하면(키 없음, 횟수
 * 초과, 네트워크 오류 등) 브라우저 내장 음성으로 대신 읽는다. 새로 읽기 시작하면 재생 중인 음성은 끊긴다.
 */
export function speakJapanese(text: string): void {
  latestRequestId += 1;
  const requestId = latestRequestId;
  currentAudio?.pause();
  currentAudio = null;
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }

  loadAudioUrl(text)
    .then((url) => {
      // 기다리는 사이 다른 문장을 눌렀다면 이 음성은 재생하지 않는다.
      if (requestId !== latestRequestId) {
        return;
      }
      const audio = new Audio(url);
      audio.playbackRate = AUDIO_PLAYBACK_RATE;
      currentAudio = audio;
      return audio.play();
    })
    .catch(() => {
      if (requestId === latestRequestId) {
        speakWithBrowserVoice(text);
      }
    });
}

async function loadAudioUrl(text: string): Promise<string> {
  const cached = audioUrlCache.get(text);
  if (cached) {
    return cached;
  }
  const url = URL.createObjectURL(await getSpeechAudio(text));
  audioUrlCache.set(text, url);
  return url;
}
