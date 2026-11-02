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
