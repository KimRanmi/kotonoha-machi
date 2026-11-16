import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cancelSpeechRecognition,
  isSpeechRecognitionSupported,
  recognizeJapaneseSpeech,
  SpeechCancelledError,
} from '../lib/speechRecognition';

/**
 * 마이크 음성 인식의 화면 상태(듣는 중 여부, 오류 메시지)를 관리한다. 오늘의 학습과 주민 대화가 함께 쓴다.
 * 컴포넌트가 사라지면 켜져 있던 마이크 인식도 멈춘다. 인식을 직접 멈추려면 `cancelSpeechRecognition`을 쓴다.
 */
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // 같은 렌더 안에서 start가 두 번 불려도 인식이 겹치지 않게, state가 아니라 ref로 막는다.
  const isListeningRef = useRef(false);

  useEffect(() => cancelSpeechRecognition, []);

  /**
   * 한 번 듣고, 최선 후보 텍스트를 `onResult`의 첫 인자로 넘긴다. 두 번째 인자는 모든 후보 목록(첫 항목이
   * 최선 후보)이다 — 기존 호출부는 첫 인자만 받으면 그대로 동작한다. 이미 듣는 중이면 무시한다.
   */
  function start(onResult: (transcript: string, candidates: string[]) => void) {
    if (isListeningRef.current) {
      return;
    }
    isListeningRef.current = true;
    setErrorMessage(null);
    setIsListening(true);

    const finish = () => {
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognizeJapaneseSpeech()
      .then((candidates) => {
        finish();
        const transcript = candidates[0] ?? '';
        if (!transcript.trim()) {
          setErrorMessage('음성을 인식하지 못했습니다. 다시 시도해주세요.');
          return;
        }
        onResult(transcript, candidates);
      })
      .catch((error: unknown) => {
        finish();
        if (error instanceof SpeechCancelledError) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : '음성 인식에 실패했습니다.');
      });
  }

  const clearError = useCallback(() => setErrorMessage(null), []);

  return {
    isSupported: isSpeechRecognitionSupported(),
    isListening,
    errorMessage,
    start,
    clearError,
  };
}
