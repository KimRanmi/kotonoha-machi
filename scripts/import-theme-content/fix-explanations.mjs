#!/usr/bin/env node
// 사용법: npm run fix-explanations
// 해설에 한글이 없는(일본어로 나온) 문제를 Gemini 1회 호출로 한국어로 다시 쓴다.
// 대상은 drafts/wiki/*.json이고, 이미 한국어인 해설은 건드리지 않는다. 결과를 파일에 저장한 뒤
// 이미 DB에 들어간 학습은 `npm run finalize-wiki -- --explanations-only`로 UPDATE 마이그레이션을 만든다.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rewriteExplanations } from './lib/gemini.mjs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'drafts', 'wiki');
const HANGUL = /[가-힣]/;
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const drafts = files.map((f) => ({ file: path.join(DIR, f), data: JSON.parse(readFileSync(path.join(DIR, f), 'utf8')) }));

const items = [];
for (const [di, d] of drafts.entries()) {
  d.data.questions.forEach((q, qi) => {
    if (!HANGUL.test(q.explanation)) {
      items.push({ id: `${di}-${qi}`, passage: d.data.passage.text, question: q.question, correctAnswer: q.choices[q.answerIndex - 1], explanation: q.explanation });
    }
  });
}
console.log(`한국어로 다시 쓸 해설 ${items.length}개 (Gemini 1회)`);
if (items.length === 0) process.exit(0);

const result = await rewriteExplanations(process.env.GEMINI_API_KEY, items);
let fixed = 0;
const bad = [];
for (const it of items) {
  const [di, qi] = it.id.split('-').map(Number);
  const text = result[it.id];
  if (typeof text === 'string' && HANGUL.test(text)) {
    drafts[di].data.questions[qi].explanationJa = it.explanation; // 원래 일본어 해설은 참고로 남긴다
    drafts[di].data.questions[qi].explanation = text.trim();
    fixed++;
  } else {
    bad.push(`${drafts[di].data.title} 문제 ${qi + 1}`);
  }
}
for (const d of drafts) writeFileSync(d.file, JSON.stringify(d.data, null, 2) + '\n');
console.log(`고침 ${fixed}개${bad.length ? `, 한국어가 아니라 못 고친 것: ${bad.join(', ')}` : ''}`);
