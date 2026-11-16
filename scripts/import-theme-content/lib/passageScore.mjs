// 도입 단락의 자동 거름과 점수. 기준이 어긋나면 항목이 아니라 이 상수·설정을 고친다.
import { readFileSync } from 'node:fs';
import kuromoji from 'kuromoji';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getKanji } from './kanjiCache.mjs';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FILTER = JSON.parse(
  readFileSync(path.join(CURRENT_DIR, '..', 'config', 'wiki-filter.json'), 'utf8'),
);

export const MIN_LENGTH = 150;
export const MAX_LENGTH = 500;
const MAX_PAREN_RATIO = 0.2;
const MAX_PROPER_NOUN_RATIO = 0.25;
const MAX_LINES = 8; // 목록처럼 줄이 너무 많으면 제외
const JLPT_MIN = 1;
const JLPT_MAX = 3;

const KANJI_RE = /[一-鿿]/g;
let tokenizerPromise;
function getTokenizer() {
  tokenizerPromise ??= new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: path.join(CURRENT_DIR, '..', 'node_modules', 'kuromoji', 'dict') })
      .build((e, t) => (e ? reject(e) : resolve(t)));
  });
  return tokenizerPromise;
}

/** 괄호 안 설명(읽는 법·영어 표기 등)을 모두 지운다. 중첩도 처리한다. 원문을 고친 것이라 출처에 "발췌·일부 가공"을 밝힌다. */
export function removeParentheses(text) {
  let depth = 0;
  let out = '';
  for (const ch of text) {
    if ('（('.includes(ch)) depth++;
    else if ('）)'.includes(ch)) depth = Math.max(0, depth - 1);
    else if (depth === 0) out += ch;
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/｡\s*/g, '。').trim();
}

/** 괄호(全角・半角) 안 글자 수 비율 */
function parenRatio(text) {
  let depth = 0;
  let inside = 0;
  for (const ch of text) {
    if ('（('.includes(ch)) depth++;
    else if ('）)'.includes(ch)) depth = Math.max(0, depth - 1);
    else if (depth > 0) inside++;
  }
  return inside / text.length;
}

/** 후보 하나를 거르고 점수를 매긴다. 제외면 { excluded: 이유 }, 통과면 점수 정보를 돌려준다. */
export async function evaluate(entry) {
  const text = entry.extract.trim();
  const title = entry.title;
  if (FILTER.excludedTitlePatterns.some((p) => new RegExp(p).test(title))) {
    return { excluded: '제목 패턴' };
  }
  if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) {
    return { excluded: `길이 ${text.length}자` };
  }
  const banned = FILTER.bannedWords.find((w) => text.includes(w) || title.includes(w));
  if (banned) return { excluded: `금지 단어 「${banned}」` };
  const badCategory = entry.categories.find((c) =>
    FILTER.excludedCategoryKeywords.some((k) => c.includes(k)),
  );
  if (badCategory) return { excluded: `제외 분류 ${badCategory}` };
  if (text.split('\n').length > MAX_LINES) return { excluded: '줄이 많음(목록형)' };
  const paren = parenRatio(text);
  if (paren > MAX_PAREN_RATIO) return { excluded: `괄호 비율 ${paren.toFixed(2)}` };

  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(text);
  const contentTokens = tokens.filter((t) => t.pos !== '記号');
  const properNouns = contentTokens.filter((t) => t.pos_detail_1 === '固有名詞').length;
  const properRatio = properNouns / Math.max(1, contentTokens.length);
  if (properRatio > MAX_PROPER_NOUN_RATIO) {
    return { excluded: `고유명사 비율 ${properRatio.toFixed(2)}` };
  }

  const kanjiChars = text.match(KANJI_RE) ?? [];
  const distinct = [...new Set(kanjiChars)];
  const levelOf = new Map();
  for (const ch of distinct) {
    levelOf.set(ch, (await getKanji(ch))?.jlptLevel ?? null);
  }
  const inRange = distinct.filter((ch) => {
    const lv = levelOf.get(ch);
    return lv !== null && lv >= JLPT_MIN && lv <= JLPT_MAX;
  });
  const unknown = distinct.filter((ch) => levelOf.get(ch) === null);
  const rangeChars = kanjiChars.filter((ch) => inRange.includes(ch)).length;
  const rangeRatio = rangeChars / Math.max(1, kanjiChars.length);

  const score =
    inRange.length * 1 + rangeRatio * 20 - unknown.length * 0.5 - properRatio * 30 - paren * 20;
  return {
    score: Math.round(score * 10) / 10,
    length: text.length,
    n123Distinct: inRange.length,
    n123Kanji: inRange.join(''),
    rangeRatio: Math.round(rangeRatio * 100) / 100,
    unknownKanji: unknown.join(''),
    properRatio: Math.round(properRatio * 100) / 100,
    parenRatio: Math.round(paren * 100) / 100,
  };
}
