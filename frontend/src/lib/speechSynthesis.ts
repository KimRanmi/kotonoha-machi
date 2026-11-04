/** 이 브라우저가 음성 합성(텍스트 읽어 주기)을 지원하는지 확인한다. */
export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

/** 학습용이라 기본(1.0)보다 천천히 읽는다. */
const SPEECH_RATE = 0.7;

/** 텍스트를 일본어 음성으로 읽어 준다. 재생 중인 음성이 있으면 끊고 새로 읽는다. */
export function speakJapanese(text: string): void {
  if (!isSpeechSynthesisSupported()) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = SPEECH_RATE;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
