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
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { readonly error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
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

/**
 * 마지막 말 이후 이만큼(밀리초) 조용하면 말이 끝난 것으로 보고 인식을 마친다. 브라우저 기본 동작은 말 사이의
 * 짧은 쉼에도 바로 끝나서 문장 중간에 잘리므로, 연속 인식을 켜고 침묵 시간을 직접 잰다.
 */
const SILENCE_TIMEOUT_MS = 5000;

/** 인식 엔진에게 요청할 후보(대안 해석) 수. 희귀 단어는 첫 후보가 엉뚱한 한자일 때가 많아 여러 개를 받는다. */
const MAX_ALTERNATIVES = 5;

let activeRecognition: SpeechRecognitionLike | null = null;
// 사용자가 취소한 인식. 취소 뒤 늦게 도착하는 종료 신호로 중간 결과가 전송되지 않게 가려낸다.
const cancelledRecognitions = new WeakSet<SpeechRecognitionLike>();

/** 진행 중인 음성 인식이 있으면 취소한다. */
export function cancelSpeechRecognition(): void {
  if (activeRecognition) {
    cancelledRecognitions.add(activeRecognition);
    activeRecognition.abort();
  }
}

/**
 * 연속 인식의 결과 조각들에서 후보 문자열 목록을 만든다. 조각마다 후보가 따로 있으므로 "k번째 후보끼리"
 * 이어 붙이고(그 조각에 k번째 후보가 없으면 첫 후보로 대신한다), 중복은 뺀다. 첫 항목은 최선 후보다.
 */
function buildCandidates(results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>): string[] {
  const candidates: string[] = [];
  for (let k = 0; k < MAX_ALTERNATIVES; k += 1) {
    let combined = '';
    for (let i = 0; i < results.length; i += 1) {
      combined += (results[i]?.[k] ?? results[i]?.[0])?.transcript ?? '';
    }
    if (combined.trim() && !candidates.includes(combined)) {
      candidates.push(combined);
    }
  }
  return candidates;
}

/**
 * 마이크로 한 번 말한 내용을 일본어로 인식해 후보 문자열 목록(첫 항목이 최선 후보)으로 돌려준다. 지원하지
 * 않는 브라우저거나 인식에 실패하면 안내 메시지를 담아 reject한다.
 */
export function recognizeJapaneseSpeech(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const SpeechRecognitionImpl = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionImpl) {
      reject(new Error('이 브라우저는 음성 인식을 지원하지 않습니다.'));
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = MAX_ALTERNATIVES;
    let candidates: string[] = [];
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;
    recognition.onresult = (event) => {
      // 연속 인식에서는 지금까지의 모든 결과가 들어 있으므로 매번 처음부터 이어 붙인다.
      candidates = buildCandidates(event.results);
      // 말이 이어지는 동안은 타이머를 계속 미루고, 조용해지면 인식을 마친다.
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => recognition.stop(), SILENCE_TIMEOUT_MS);
    };
    // 이전 인식의 늦은 종료 신호가 새로 시작한 인식의 취소 핸들을 지우지 않게, 자기 자신일 때만 비운다.
    const clearIfActive = () => {
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
    };
    recognition.onerror = (event) => {
      clearTimeout(silenceTimer);
      clearIfActive();
      if (event.error === 'aborted') {
        reject(new SpeechCancelledError());
      } else if (candidates.length > 0 && !cancelledRecognitions.has(recognition)) {
        // 말을 하던 중 오류로 끊겨도 이미 인식한 말은 살린다.
        resolve(candidates);
      } else {
        reject(new Error('음성을 인식하지 못했습니다. 다시 시도해주세요.'));
      }
    };
    // 인식이 끝나면 모은 말을 돌려준다. 취소했거나 아무 말도 없었으면 취소로 처리해 대기 중인 Promise가 남지 않게 한다.
    recognition.onend = () => {
      clearTimeout(silenceTimer);
      clearIfActive();
      if (candidates.length > 0 && !cancelledRecognitions.has(recognition)) {
        resolve(candidates);
      } else {
        reject(new SpeechCancelledError());
      }
    };
    activeRecognition = recognition;
    try {
      recognition.start();
    } catch {
      clearIfActive();
      reject(new Error('음성 인식을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.'));
    }
  });
}
