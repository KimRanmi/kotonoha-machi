#!/usr/bin/env node
// 사용법: npm run pick -- --pick 3,7,12
// 마지막 collect 결과(cache/last-candidates.json)의 번호로 지문을 골라 approved/readings.json에 저장한다.
// 저장 항목: 문서 제목, source_url(oldid 고정), 라이선스, 본문, 가져온 날짜. 같은 문서는 덮어쓴다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCache } from './lib/wikipedia.mjs';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(CURRENT_DIR, 'approved', 'readings.json');
const LICENSE = 'CC BY-SA 4.0';

const args = process.argv.slice(2);
const pickIndex = args.indexOf('--pick');
if (pickIndex < 0 || !args[pickIndex + 1]) {
  throw new Error('사용법: npm run pick -- --pick 3,7,12');
}
const numbers = args[pickIndex + 1].split(',').map((n) => Number(n.trim()));
const candidates = readCache('last-candidates.json');
if (!candidates) throw new Error('먼저 npm run collect 를 실행해 후보 목록을 만드세요.');

const approved = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const today = new Date().toISOString().slice(0, 10);
for (const n of numbers) {
  const c = candidates.find((x) => x.number === n);
  if (!c) throw new Error(`번호 ${n}번 후보가 없습니다(1~${candidates.length}).`);
  const entry = {
    sourceTitle: c.title,
    sourceUrl: c.sourceUrl,
    license: LICENSE,
    isExcerpt: true,
    passage: c.passage,
    fetchedAt: today,
  };
  const existing = approved.findIndex((a) => a.sourceTitle === c.title);
  if (existing >= 0) approved[existing] = entry;
  else approved.push(entry);
  console.log(`승인: ${n}. ${c.title}`);
}
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(approved, null, 2) + '\n');
console.log(`approved/readings.json: 총 ${approved.length}개`);
