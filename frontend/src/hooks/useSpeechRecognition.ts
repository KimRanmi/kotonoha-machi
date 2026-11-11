import { useCallback, useEffect, useState } from 'react';
import {
  cancelSpeechRecognition,
  isSpeechRecognitionSupported,
  recognizeJapaneseSpeech,
  SpeechCancelledError,
} from '../lib/speechRecognition';

/**
 * 마이크 음성 인식의 화면 상태(듣는 중 여부, 오류 메시지)를 관리한다. 테마 학습과 주민 대화가 함께 쓴다.
 * 컴포넌트가 사라지면 켜져 있던 마이크 인식도 멈춘다.
 */
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => cancelSpeechRecognition, []);

  /** 한 번 듣고, 인식된 텍스트를 `onResult`로 넘긴다. 이미 듣는 중이면 무시한다. */
  const start = useCallback(
    (onResult: (transcript: string) => void) => {
      if (isListening) {
        return;
      }
      setErrorMessage(null);
      setIsListening(true);

      recognizeJapaneseSpeech()
        .then((transcript) => {
          setIsListening(false);
          onResult(transcript);
        })
        .catch((error: unknown) => {
          setIsListening(false);
          if (error instanceof SpeechCancelledError) {
            return;
          }
          setErrorMessage(error instanceof Error ? error.message : '음성 인식에 실패했습니다.');
        });
    },
    [isListening],
  );

  const clearError = useCallback(() => setErrorMessage(null), []);

  return {
    isSupported: isSpeechRecognitionSupported(),
    isListening,
    errorMessage,
    start,
    cancel: cancelSpeechRecognition,
    clearError,
  };
}
