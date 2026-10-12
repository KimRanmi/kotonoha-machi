// 일본어 음성 읽기(브라우저 내장 음성 합성). 지원하지 않는 브라우저에서는 조용히 아무것도 하지 않는다.
export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakJapanese(text: string) {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
