// kanjiapi.dev 단어 조회(캐시 + 모호함 판정). 기존 fetchWord와 같은 규칙(표기 완전 일치,
// priorities 우선)을 쓰되, "애매한가"를 같이 돌려줘서 의심 목록에 올릴 수 있게 한다.
import { readCache, writeCache } from './wikipedia.mjs';

const BASE_URL = 'https://kanjiapi.dev/v1';
const CALL_INTERVAL_MS = 150;
let cache;

async function fetchEntriesByFirstChar(character) {
  cache ??= readCache('words.json') ?? {};
  if (!(character in cache)) {
    await new Promise((resolve) => setTimeout(resolve, CALL_INTERVAL_MS));
    const response = await fetch(`${BASE_URL}/words/${encodeURIComponent(character)}`);
    cache[character] = response.ok ? await response.json() : [];
    writeCache('words.json', cache);
  }
  return cache[character];
}

/**
 * 표기(written)로 단어를 조회한다. 못 찾으면 null.
 * ambiguous: 읽는 법이 서로 다른 후보가 여럿인데 priorities로 하나를 못 정한 경우(확인 필요).
 */
export async function lookupWord(surfaceForm) {
  const entries = await fetchEntriesByFirstChar(Array.from(surfaceForm)[0]);
  const candidates = entries.flatMap((entry) =>
    entry.variants
      .filter((variant) => variant.written === surfaceForm)
      .map((variant) => ({ variant, meanings: entry.meanings })),
  );
  if (candidates.length === 0) return null;

  const prioritized = candidates.filter((c) => c.variant.priorities.length > 0);
  const pool = prioritized.length > 0 ? prioritized : candidates;
  const readings = new Set(pool.map((c) => c.variant.pronounced));
  const best = pool[0];
  return {
    surfaceForm,
    reading: best.variant.pronounced,
    meaning: best.meanings.flatMap((m) => m.glosses).join(', '),
    ambiguous: readings.size > 1,
    otherReadings: [...readings].filter((r) => r !== best.variant.pronounced),
  };
}
