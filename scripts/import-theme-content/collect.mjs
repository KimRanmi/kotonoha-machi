#!/usr/bin/env node
// 사용법: npm run collect -- [--date 11월16일 → "11月16日"] [--category 良質な記事 --limit 200] [--top 10]
// 날짜 문서의 「記念日・年中行事」 링크(또는 분류)에서 후보를 모아 도입 단락을 가져오고(캐시),
// 거름·점수를 매겨 candidates/wiki/<이름>.md 로 출력한다. 마지막 목록은 pick이 번호로 읽는다.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAnniversaryLinks, fetchCategoryMembers, fetchIntros, oldidUrl, writeCache } from './lib/wikipedia.mjs';
import { saveKanjiCache } from './lib/kanjiCache.mjs';
import { evaluate } from './lib/passageScore.mjs';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const o = {};
  for (let i = 0; i < args.length; i += 2) o[args[i].replace(/^--/, '')] = args[i + 1];
  return { date: o.date ?? '11月16日', month: o.month ? Number(o.month) : null, category: o.category, limit: Number(o.limit ?? 100), top: Number(o.top ?? 10) };
}

const options = parseArgs();
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const dates = options.month
  ? Array.from({ length: DAYS_IN_MONTH[options.month - 1] }, (_, i) => `${options.month}月${i + 1}日`)
  : [options.date];
const source = options.category
  ? `분류 ${options.category}`
  : options.month
    ? `${options.month}月 전체 날짜 記念日・年中行事`
    : `「${options.date}」 記念日・年中行事`;
let titles = [];
if (options.category) {
  titles = await fetchCategoryMembers(options.category, options.limit);
} else {
  for (const date of dates) {
    try {
      titles.push(...(await fetchAnniversaryLinks(date)));
    } catch (error) {
      console.warn(`${date} 건너뜀: ${error.message}`); // 한 날짜가 실패해도 나머지는 계속한다
    }
  }
  titles = [...new Set(titles)];
}
console.log(`${source}: 링크 ${titles.length}개`);

const intros = await fetchIntros(titles);
const passed = [];
const excludedLog = [];
for (const entry of intros) {
  const result = await evaluate(entry);
  if (result.excluded) {
    excludedLog.push(`${entry.title}: ${result.excluded}`);
  } else {
    passed.push({ entry, ...result });
  }
}
saveKanjiCache();
passed.sort((a, b) => b.score - a.score);
const top = passed.slice(0, options.top);

const lines = [`# 지문 후보 (${source})`, '', `후보 ${intros.length}개 → 거름 통과 ${passed.length}개 → 상위 ${top.length}개`, ''];
const saved = [];
top.forEach(({ entry, ...r }, index) => {
  const n = index + 1;
  const url = oldidUrl(entry.title, entry.revid);
  lines.push(
    `## ${n}. ${entry.title}`,
    '',
    `- 글자 수 ${r.length} / 점수 ${r.score} / N1~N3 한자 ${r.n123Distinct}종(${r.n123Kanji}) / 비율 ${r.rangeRatio}`,
    `- 목록 밖 한자: ${r.unknownKanji || '없음'} / 고유명사 ${r.properRatio} / 괄호 ${r.parenRatio}`,
    `- 출처: ${url}`,
    '',
    entry.extract.trim().replace(/^/gm, '> '),
    '',
  );
  saved.push({ number: n, title: entry.title, revid: entry.revid, sourceUrl: url, passage: entry.extract.trim(), score: r.score });
});
lines.push('## 제외된 후보(이유)', '', ...excludedLog.map((l) => `- ${l}`));

const slug = options.category ?? (options.month ? `${options.month}月` : options.date);
const outDir = path.join(CURRENT_DIR, 'candidates', 'wiki');
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `${slug}.md`);
writeFileSync(outFile, lines.join('\n'));
writeCache('last-candidates.json', saved);
console.log(`저장: ${outFile}`);
