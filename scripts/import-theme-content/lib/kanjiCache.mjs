// kanjiapi.dev 한자 조회에 로컬 캐시(cache/kanji.json)와 호출 간격을 붙인 래퍼.
// 같은 한자는 한 번만 조회한다. 못 찾은 한자도 null로 기억한다.
import { fetchKanji } from './kanjiApi.mjs';
import { readCache, writeCache } from './wikipedia.mjs';

const CALL_INTERVAL_MS = 120;
let cache;

export async function getKanji(character) {
  cache ??= readCache('kanji.json') ?? {};
  if (character in cache) {
    return cache[character];
  }
  await new Promise((resolve) => setTimeout(resolve, CALL_INTERVAL_MS));
  cache[character] = await fetchKanji(character);
  return cache[character];
}

export function saveKanjiCache() {
  if (cache) writeCache('kanji.json', cache);
}
