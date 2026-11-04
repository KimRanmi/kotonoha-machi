/** 이 브라우저가 음성 합성(텍스트 읽어 주기)을 지원하는지 확인한다. */
export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

/** 학습용이라 기본(1.0)보다 천천히 읽는다. */
const SPEECH_RATE = 0.5;

/** 브라우저/OS별 일본어 여성 음성 이름(Mac, Windows, Chrome 기준). 이름에 포함되면 여성 음성으로 본다. */
const FEMALE_VOICE_NAME_PATTERN = /kyoko|o-ren|haruka|ayumi|nanami|mizuki|google 日本語|female/i;

/** 일본어 음성 중 여성 음성을 우선 고른다. 없으면 첫 일본어 음성을, 일본어 음성이 없으면 null을 돌려준다. */
function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  const japaneseVoices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.replace('_', '-').toLowerCase().startsWith('ja'));
  return (
    japaneseVoices.find((voice) => FEMALE_VOICE_NAME_PATTERN.test(voice.name)) ??
    japaneseVoices[0] ??
    null
  );
}

/** 텍스트를 일본어 음성으로 읽어 준다. 재생 중인 음성이 있으면 끊고 새로 읽는다. */
export function speakJapanese(text: string): void {
  if (!isSpeechSynthesisSupported()) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = SPEECH_RATE;
  const voice = pickJapaneseVoice();
  if (voice) {
    utterance.voice = voice;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
