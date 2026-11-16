/**
 * 두 문자열이 얼마나 비슷한지 0~1 사이 비율로 계산한다(1이면 완전히 같음). 레벤슈타인 거리(한 문자열을
 * 다른 문자열로 바꾸는 데 필요한 최소 삽입·삭제·치환 횟수)를 두 문자열 중 긴 쪽의 길이로 나눠서 구한다.
 * 음성 인식 결과와 정답 문구를 글자 단위로 비교하는 데 쓴다(음소 단위의 정밀한 발음 채점은 아니다).
 */
export function calculateTextSimilarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) {
    return 1;
  }

  const distance = levenshteinDistance(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

/** 음성 인식 결과와 정답 문구를 비교하기 전에 공백 차이를 무시하도록 정리한다. */
function normalizeForSpeechComparison(text: string): string {
  return text.replace(/\s+/g, '').trim();
}

/**
 * 음성 인식 후보 목록 중 정답과 가장 잘 맞는 것을 고른다. 각 후보를 정답 표기(한자 등)와 비교한 유사도,
 * 읽는 법(가나)이 있다면 그것과 비교한 유사도(가타카나는 히라가나로 맞춰서 비교) 중 큰 값을 그 후보의
 * 정확도로 보고, 정확도가 가장 높은 후보와 그 값을 돌려준다. 인식 엔진이 같은 발음을 한자로 돌려주든
 * 가나로 돌려주든, 후보 중 하나만 맞아도 맞힌 걸로 보기 위해서다. 후보가 없으면 null.
 */
export function findBestSpeechMatch(
  candidates: string[],
  correctAnswer: string,
  reading: string | null | undefined,
): { transcript: string; accuracy: number } | null {
  const normalizedAnswer = normalizeForSpeechComparison(correctAnswer);
  const normalizedReading = reading ? toHiragana(normalizeForSpeechComparison(reading)) : null;
  let best: { transcript: string; accuracy: number } | null = null;
  for (const candidate of candidates) {
    const normalized = normalizeForSpeechComparison(candidate);
    let accuracy = calculateTextSimilarity(normalized, normalizedAnswer);
    if (normalizedReading) {
      accuracy = Math.max(
        accuracy,
        calculateTextSimilarity(toHiragana(normalized), normalizedReading),
      );
    }
    if (best === null || accuracy > best.accuracy) {
      best = { transcript: candidate, accuracy };
    }
  }
  return best;
}

const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

/**
 * 가타카나를 히라가나로 바꾼다(그 외 문자는 그대로 둔다). 음성 인식 결과가 같은 발음을 가타카나로
 * 돌려줄 수도 있어서, 히라가나로 저장된 읽는 법과 비교하기 전에 표기를 맞추는 데 쓴다.
 */
export function toHiragana(text: string): string {
  return Array.from(text)
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= KATAKANA_START && codePoint <= KATAKANA_END
        ? String.fromCodePoint(codePoint - KATAKANA_TO_HIRAGANA_OFFSET)
        : character;
    })
    .join('');
}

/** 히라가나를 가타카나로 바꾼다(그 외 문자는 그대로 둔다). 읽는 법을 가타카나로도 보여줄 때 쓴다. */
export function toKatakana(text: string): string {
  return Array.from(text)
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      const hiraganaStart = KATAKANA_START - KATAKANA_TO_HIRAGANA_OFFSET;
      const hiraganaEnd = KATAKANA_END - KATAKANA_TO_HIRAGANA_OFFSET;
      return codePoint >= hiraganaStart && codePoint <= hiraganaEnd
        ? String.fromCodePoint(codePoint + KATAKANA_TO_HIRAGANA_OFFSET)
        : character;
    })
    .join('');
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const columns = b.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () => new Array<number>(columns));

  for (let i = 0; i < rows; i += 1) {
    distances[i][0] = i;
  }
  for (let j = 0; j < columns; j += 1) {
    distances[0][j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < columns; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        distances[i][j] = distances[i - 1][j - 1];
      } else {
        distances[i][j] =
          1 + Math.min(distances[i - 1][j], distances[i][j - 1], distances[i - 1][j - 1]);
      }
    }
  }

  return distances[rows - 1][columns - 1];
}
