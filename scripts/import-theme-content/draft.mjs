#!/usr/bin/env node
// 사용법: npm run draft -- [--only "문서 제목"] [--translate]
// approved/readings.json의 지문마다 학습 초안(drafts/wiki/<제목>.json)을 만든다.
//  - 형태소 분석(kuromoji): 명사 → 단어(WORD), 동사·형용사 → 표현(EXPRESSION), 한자는 지문 안 어려운 순.
//  - 뜻·읽는 법·JLPT는 kanjiapi.dev, 예문은 Tatoeba. N1~N3 밖은 제외.
//  - 애매한 것은 초안의 suspects(확인 필요 목록)에 올리고 화면에도 출력한다.
//  - --translate: 영어 뜻 한국어 번역(Gemini 1회, 모든 지문 묶음). 없으면 영어 뜻 그대로 두고 untranslated로 표시.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import kuromoji from 'kuromoji';
import { getKanji, saveKanjiCache } from './lib/kanjiCache.mjs';
import { lookupWord } from './lib/wordLookup.mjs';
import { computeWordJlptLevel } from './lib/kanjiApi.mjs';
import { searchJapaneseExample } from './lib/tatoebaApi.mjs';
import { generateReading } from './lib/furigana.mjs';
import { translateMeanings } from './lib/gemini.mjs';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const KANJI_COUNT = 3;
const WORD_COUNT = 3;
const EXPRESSION_COUNT = 2;
const MAX_EXAMPLES = 4;
const JLPT_MIN = 1;
const JLPT_MAX = 3;
const KANJI_RE = /[一-鿿]/;

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const translate = args.includes('--translate');

const inRange = (lv) => lv !== null && lv >= JLPT_MIN && lv <= JLPT_MAX;

function toHiragana(text) {
  return text.replace(/[ァ-ヶ]/g, (c) => String.fromCodePoint(c.codePointAt(0) - 0x60));
}

function buildTokenizer() {
  return new Promise((resolve, reject) =>
    kuromoji
      .builder({ dicPath: path.join(CURRENT_DIR, 'node_modules', 'kuromoji', 'dict') })
      .build((e, t) => (e ? reject(e) : resolve(t))),
  );
}

/** 어려운 순(레벨 숫자가 작을수록 어려움) → 지문 내 등장 횟수 많은 순 */
function byDifficulty(a, b) {
  return a.level - b.level || b.count - a.count;
}

async function pickKanji(passage, suspects) {
  const counts = new Map();
  for (const ch of passage) if (KANJI_RE.test(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const ranked = [];
  for (const [ch, count] of counts) {
    const k = await getKanji(ch);
    if (k && inRange(k.jlptLevel)) ranked.push({ ch, k, count, level: k.jlptLevel });
  }
  ranked.sort(byDifficulty);
  return ranked.slice(0, KANJI_COUNT).map((r, i) => {
    if (!r.k.meaning || !r.k.onReading && !r.k.kunReading) suspects.push(`한자 ${r.ch}: 읽는 법/뜻 비어 있음`);
    return { ...r.k, displayOrder: i + 1 };
  });
}

/** 지문에서 후보 단어(명사) / 표현(동사·형용사)을 모은다: { surface(사전형), count, reading(지문 속 읽는 법) } */
function collectTokens(tokens, kind) {
  const found = new Map();
  for (const t of tokens) {
    const isNoun =
      t.pos === '名詞' &&
      !['固有名詞', '数', '代名詞', '非自立', '接尾', '副詞可能'].includes(t.pos_detail_1);
    const isPredicate = (t.pos === '動詞' || t.pos === '形容詞') && t.pos_detail_1 === '自立';
    if ((kind === 'WORD' && !isNoun) || (kind === 'EXPRESSION' && !isPredicate)) continue;
    const surface = kind === 'EXPRESSION' ? t.basic_form : t.surface_form;
    if (!surface || surface === '*' || !KANJI_RE.test(surface) || Array.from(surface).length < 2) continue;
    const entry = found.get(surface) ?? { surface, count: 0, tokenReading: t.reading ? toHiragana(t.reading) : null };
    entry.count++;
    found.set(surface, entry);
  }
  return [...found.values()];
}

async function pickVocabulary(tokens, kind, count, taken, suspects, rejected) {
  const ranked = [];
  for (const c of collectTokens(tokens, kind)) {
    if (taken.has(c.surface)) continue;
    const level = await computeWordJlptLevel(c.surface);
    if (!inRange(level)) {
      rejected.push({ type: kind, surfaceForm: c.surface, reason: `레벨 N1~N3 밖(jlpt=${level})` });
      continue;
    }
    ranked.push({ ...c, level });
  }
  ranked.sort(byDifficulty);
  const picked = [];
  for (const c of ranked) {
    if (picked.length >= count) break;
    const word = await lookupWord(c.surface);
    if (!word) {
      rejected.push({ type: kind, surfaceForm: c.surface, reason: 'kanjiapi.dev에서 못 찾음' });
      continue;
    }
    const flags = [];
    if (word.ambiguous) flags.push(`읽는 법이 여럿(${[word.reading, ...word.otherReadings].join('/')}) 우선순위로 못 정함`);
    if (kind === 'WORD' && c.tokenReading && c.tokenReading !== word.reading) {
      flags.push(`지문 읽는 법(${c.tokenReading})과 사전(${word.reading})이 다름`);
    }
    if (flags.length) suspects.push(`${kind} ${c.surface}: ${flags.join('; ')}`);
    taken.add(c.surface);
    picked.push({
      surfaceForm: word.surfaceForm,
      reading: word.reading,
      meaning: word.meaning,
      jlptLevel: c.level,
      displayOrder: picked.length + 1,
      ...(flags.length ? { check: flags.join('; ') } : {}),
    });
  }
  if (picked.length < count) suspects.push(`${kind}: ${count}개 중 ${picked.length}개만 찾음`);
  return picked;
}

async function pickExamples(vocab, suspects, rejected) {
  const examples = [];
  const seen = new Set();
  for (const w of vocab) {
    if (examples.length >= MAX_EXAMPLES) break;
    await new Promise((r) => setTimeout(r, 400));
    const ex = await searchJapaneseExample(w.surfaceForm).catch(() => null);
    if (!ex || seen.has(ex.japaneseSentence)) {
      rejected.push({ type: 'example', keyword: w.surfaceForm, reason: 'Tatoeba에 한국어 번역 있는 예문 없음' });
      continue;
    }
    seen.add(ex.japaneseSentence);
    examples.push({
      ...ex,
      keyword: w.surfaceForm,
      reading: await generateReading(ex.japaneseSentence),
      readingStatus: '자동 생성(검수 필요)',
      displayOrder: examples.length + 1,
    });
  }
  if (examples.length < MAX_EXAMPLES) suspects.push(`예문: ${MAX_EXAMPLES}개 중 ${examples.length}개만 찾음`);
  return examples;
}

const approvedPath = path.join(CURRENT_DIR, 'approved', 'readings.json');
if (!existsSync(approvedPath)) throw new Error('approved/readings.json이 없습니다. 먼저 npm run pick 을 실행하세요.');
let approved = JSON.parse(readFileSync(approvedPath, 'utf8'));
if (only) approved = approved.filter((a) => a.sourceTitle === only);

const tokenizer = await buildTokenizer();
const outDir = path.join(CURRENT_DIR, 'drafts', 'wiki');
mkdirSync(outDir, { recursive: true });
const drafts = [];

for (const item of approved) {
  console.log(`\n== ${item.sourceTitle}`);
  const suspects = [];
  const rejected = [];
  const tokens = tokenizer.tokenize(item.passage);
  const kanji = await pickKanji(item.passage, suspects);
  const taken = new Set();
  const word = await pickVocabulary(tokens, 'WORD', WORD_COUNT, taken, suspects, rejected);
  const expression = await pickVocabulary(tokens, 'EXPRESSION', EXPRESSION_COUNT, taken, suspects, rejected);
  const examples = await pickExamples([...word, ...expression], suspects, rejected);
  const draft = {
    title: item.sourceTitle,
    passage: {
      sourceTitle: item.sourceTitle,
      sourceUrl: item.sourceUrl,
      license: item.license,
      isExcerpt: item.isExcerpt,
      text: item.passage,
    },
    kanji,
    vocabulary: { WORD: word, EXPRESSION: expression },
    examples,
    questions: [],
    suspects,
    rejected,
  };
  for (const e of [...kanji, ...word, ...expression]) {
    e.meaningEn = e.meaning;
    e.meaningStatus = '번역 전(영어 그대로)';
  }
  drafts.push(draft);
  console.log(`한자 ${kanji.map((k) => `${k.kanji}(N${k.jlptLevel})`).join(' ')}`);
  console.log(`단어 ${word.map((w) => `${w.surfaceForm}[${w.reading}] ${w.meaning.split(',')[0]}`).join(' / ')}`);
  console.log(`표현 ${expression.map((w) => `${w.surfaceForm}[${w.reading}] ${w.meaning.split(',')[0]}`).join(' / ')}`);
  console.log(`예문 ${examples.length}개`);
  console.log(suspects.length ? `확인 필요 ${suspects.length}건:\n  - ${suspects.join('\n  - ')}` : '확인 필요 없음');
}
saveKanjiCache();

if (translate) {
  if (!process.env.GEMINI_API_KEY) throw new Error('--translate에는 GEMINI_API_KEY가 필요합니다(.env).');
  const targets = drafts.flatMap((d) => [...d.kanji, ...Object.values(d.vocabulary).flat()]);
  console.log(`\n영어 뜻 ${targets.length}개를 한국어로 번역(Gemini 1회)...`);
  const result = await translateMeanings(process.env.GEMINI_API_KEY, targets.map((t, i) => ({ id: String(i), english: t.meaningEn })));
  targets.forEach((t, i) => {
    if (result[String(i)]) {
      t.meaning = result[String(i)];
      t.meaningStatus = '번역 초안(검수 필요)';
    }
  });
}

for (const d of drafts) {
  const slug = d.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  writeFileSync(path.join(outDir, `${slug}.json`), JSON.stringify(d, null, 2) + '\n');
}
console.log(`\n초안 ${drafts.length}개를 drafts/wiki/에 저장했습니다.`);
