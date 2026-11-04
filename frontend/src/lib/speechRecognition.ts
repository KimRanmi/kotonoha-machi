/**
 * 브라우저의 Web Speech API(SpeechRecognition)로 일본어 발음을 텍스트로 바꾼다. 표준 TypeScript DOM
 * 타입에는 이 API가 없어 아래에 필요한 만큼만 직접 선언한다.
 */
interface SpeechRecognitionResultLike {
  readonly transcript: string;
}

interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { readonly error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const globalWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition;
}

/** 이 브라우저가 음성 인식을 지원하는지 확인한다. */
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== undefined;
}

/** 사용자가 직접 취소했거나 아무 결과 없이 인식이 끝났을 때 던진다(오류 메시지를 보여주지 않는다). */
export class SpeechCancelledError extends Error {}

let activeRecognition: SpeechRecognitionLike | null = null;

/** 진행 중인 음성 인식이 있으면 취소한다. */
export function cancelSpeechRecognition(): void {
  activeRecognition?.abort();
}

/**
 * 마이크로 한 번 말한 내용을 일본어로 인식해 텍스트로 돌려준다. 지원하지 않는 브라우저거나 인식에 실패하면
 * 안내 메시지를 담아 reject한다.
 */
export function recognizeJapaneseSpeech(): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognitionImpl = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionImpl) {
      reject(new Error('이 브라우저는 음성 인식을 지원하지 않습니다.'));
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      resolve(transcript);
    };
    recognition.onerror = (event) => {
      reject(
        event.error === 'aborted'
          ? new SpeechCancelledError()
          : new Error('음성을 인식하지 못했습니다. 다시 시도해주세요.'),
      );
    };
    // 결과 없이 끝난 경우에도 대기 중인 Promise가 영원히 남지 않게 한다(이미 처리됐으면 무시된다).
    recognition.onend = () => {
      activeRecognition = null;
      reject(new SpeechCancelledError());
    };
    activeRecognition = recognition;
    recognition.start();
  });
}
