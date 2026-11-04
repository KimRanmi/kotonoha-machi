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

/** 텍스트를 일본어 음성으로 읽어 준다. 재생 중인 음성이 있으면 끊고 새로 읽는다. */
export function speakJapanese(text: string): void {
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
