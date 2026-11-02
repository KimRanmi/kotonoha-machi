// kuromoji(형태소 분석기)로 예문 전체의 히라가나 읽는 법을 자동 생성한다. 이 패키지의 유일한 새
// 의존성이고, 이 1회성 개발 도구에서만 쓰며 백엔드/프런트엔드 앱에는 번들되지 않는다. 자동 생성
// 결과는 초안일 뿐이라 사람이 draft 파일을 검토할 때 틀린 부분이 있으면 직접 고쳐야 한다.
import kuromoji from 'kuromoji';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DICTIONARY_PATH = path.join(CURRENT_DIR, '..', 'node_modules', 'kuromoji', 'dict');

const KATAKANA_START = 0x30a1;
const KATAKANA_END = 0x30f6;
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

function toHiragana(text) {
  return Array.from(text)
    .map((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint >= KATAKANA_START && codePoint <= KATAKANA_END
        ? String.fromCodePoint(codePoint - KATAKANA_TO_HIRAGANA_OFFSET)
        : character;
    })
    .join('');
}

let tokenizerPromise;

function getTokenizer() {
  tokenizerPromise ??= new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: DICTIONARY_PATH })
      .build((error, tokenizer) => (error ? reject(error) : resolve(tokenizer)));
  });
  return tokenizerPromise;
}

/** 일본어 문장 전체를 히라가나로 읽은 법으로 바꾼다(형태소 분석 기반 자동 생성, 사람 검토 필요). */
export async function generateReading(sentence) {
  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(sentence);
  const reading = tokens.map((token) => token.reading ?? token.surface_form).join('');
  return toHiragana(reading);
}
