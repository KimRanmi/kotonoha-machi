// 일본어 위키백과(공식 MediaWiki API) 조회. 규칙(MediaWiki API Etiquette, Wikimedia UA 정책):
// 요청은 하나씩 순서대로, 제목은 | 로 묶어 배치, maxlag 지정, 결과는 로컬 캐시(cache/)에 저장한다.
// User-Agent는 일반적인 클라이언트 이름만 쓴다(0038 결정: 연락처 없이). 403이 나면 사용자와 상의한다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(CURRENT_DIR, '..', 'cache');
const API_URL = 'https://ja.wikipedia.org/w/api.php';
const USER_AGENT = 'kotonoha-import-tool/0.1';
const REQUEST_INTERVAL_MS = 1200;
const MAX_LAG_SECONDS = 5;
const BATCH_SIZE = 20;

let lastRequestAt = 0;

async function callApi(params) {
  const wait = REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  const url = new URL(API_URL);
  const query = { format: 'json', formatversion: '2', maxlag: String(MAX_LAG_SECONDS), ...params };
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    lastRequestAt = Date.now();
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.status === 429 || response.status === 503) {
      console.warn(`  (${response.status}) 잠시 기다린 뒤 재시도 ${attempt}/4`);
      await new Promise((resolve) => setTimeout(resolve, 5000 * attempt)); // 점점 길게 기다린다
      continue;
    }
    if (!response.ok) {
      throw new Error(`위키백과 API 실패(${response.status}): ${url}`);
    }
    const data = await response.json();
    if (data.error?.code === 'maxlag') {
      console.warn(`  (maxlag) 재시도 ${attempt}/4`);
      await new Promise((resolve) => setTimeout(resolve, 5000 * attempt));
      continue;
    }
    if (data.error) {
      throw new Error(`위키백과 API 오류: ${JSON.stringify(data.error)}`);
    }
    return data;
  }
  throw new Error(`위키백과 API 재시도 한도 초과: ${url}`);
}

export function readCache(name) {
  const file = path.join(CACHE_DIR, name);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

export function writeCache(name, data) {
  const file = path.join(CACHE_DIR, name);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2));
}

/**
 * 날짜 문서(예 "11月16日")의 「記念日・年中行事」 섹션에 있는 [[링크]] 제목들.
 * action=parse는 요청 제한이 빡빡해서(429), 위키텍스트를 한 번 받아 섹션을 직접 잘라 쓴다.
 * 날짜별 결과는 캐시해서 다시 부르지 않는다. 존재하지 않는 문서는 이후 단계에서 걸러진다.
 */
export async function fetchAnniversaryLinks(dateTitle) {
  const cache = readCache('anniversary-links.json') ?? {};
  if (dateTitle in cache) {
    return cache[dateTitle];
  }
  const data = await callApi({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    titles: dateTitle,
  });
  const wikitext = data.query.pages[0]?.revisions?.[0]?.slots?.main?.content ?? '';
  const sectionMatch = wikitext.match(/^==\s*記念日・年中行事\s*==\s*$([\s\S]*?)(?=^==[^=]|(?![\s\S]))/m);
  const links = new Set();
  for (const m of (sectionMatch?.[1] ?? '').matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)) {
    links.add(m[1].trim());
  }
  cache[dateTitle] = [...links];
  writeCache('anniversary-links.json', cache);
  return cache[dateTitle];
}

/** 분류의 문서 제목들(보조 후보). limit개까지. */
export async function fetchCategoryMembers(category, limit) {
  const titles = [];
  let cont = {};
  while (titles.length < limit) {
    const data = await callApi({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmnamespace: '0',
      cmlimit: '100',
      ...cont,
    });
    titles.push(...data.query.categorymembers.map((m) => m.title));
    if (!data.continue) break;
    cont = data.continue;
  }
  return titles.slice(0, limit);
}

/** 제목들의 도입 단락(평문)·리비전 번호·분류를 가져온다. 캐시에 있으면 호출하지 않는다. */
export async function fetchIntros(titles) {
  const cache = readCache('wiki-intros.json') ?? {};
  const missing = titles.filter((t) => !(t in cache));
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const merged = new Map();
    const redirectMap = new Map(); // 리다이렉트로 바뀐 제목: 원래 제목 → 실제 제목
    let cont = {};
    do {
      const data = await callApi({
        action: 'query',
        prop: 'extracts|revisions|categories',
        exintro: '1',
        explaintext: '1',
        exlimit: String(BATCH_SIZE),
        rvprop: 'ids',
        cllimit: 'max',
        redirects: '1',
        titles: batch.join('|'),
        ...cont,
      });
      for (const r of data.query.redirects ?? []) {
        redirectMap.set(r.from, r.to);
      }
      for (const page of data.query.pages) {
        const entry = merged.get(page.title) ?? { title: page.title, categories: [] };
        entry.extract = entry.extract || page.extract || '';
        entry.revid = entry.revid ?? page.revisions?.[0]?.revid ?? null;
        entry.categories.push(...(page.categories ?? []).map((c) => c.title));
        merged.set(page.title, entry);
      }
      cont = data.continue ?? null;
    } while (cont);
    for (const title of batch) {
      cache[title] = merged.get(redirectMap.get(title) ?? title) ?? null;
    }
    writeCache('wiki-intros.json', cache);
  }
  return titles.map((t) => cache[t]).filter(Boolean);
}

export function oldidUrl(title, revid) {
  return `https://ja.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&oldid=${revid}`;
}
