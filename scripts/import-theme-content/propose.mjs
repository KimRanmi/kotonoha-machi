#!/usr/bin/env node
// 사용법: npm run propose -- --title "<테마 제목>" --topic "<어떤 주제인지 설명>"
//
// 1. Gemini가 후보 표기(한자·단어·표현)만 추천한다(뜻/읽는 법은 안 지어냄).
// 2. kanjiapi.dev로 각 후보의 실제 뜻/읽는 법/JLPT 레벨을 조회하고, N1~N3 범위 밖이면 거부한다.
// 3. 통과한 단어로 Gemini에게 Tatoeba 검색 키워드를 추천받고, Tatoeba에서 실제 예문을 검색한다.
// 4. kuromoji로 예문의 읽는 법을 자동 생성한다.
// 5. drafts/<테마 슬러그>.json에 초안을 쓴다 — 이 파일은 사람이 검토·수정한 뒤 finalize.mjs에
//    넘겨야 한다. 이 스크립트는 DB나 SQL 파일을 직접 건드리지 않는다.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suggestCandidates, translateMeanings } from './lib/gemini.mjs';
import { fetchKanji, fetchWord, computeWordJlptLevel } from './lib/kanjiApi.mjs';
import { searchJapaneseExample } from './lib/tatoebaApi.mjs';
import { generateReading } from './lib/furigana.mjs';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MIN_JLPT_LEVEL = 1;
const MAX_JLPT_LEVEL = 3;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    options[args[i].replace(/^--/, '')] = args[i + 1];
  }
  if (!options.title || (!options.topic && !options.candidates)) {
    throw new Error(
      '사용법: npm run propose -- --title "<테마 제목>" (--topic "<주제 설명>" | --candidates <후보.json>)',
    );
  }
  return options;
}

function isLevelInRange(level) {
  return level !== null && level >= MIN_JLPT_LEVEL && level <= MAX_JLPT_LEVEL;
}

async function buildKanjiEntries(candidates) {
  const accepted = [];
  const rejected = [];
  let displayOrder = 1;
  for (const character of candidates) {
    const kanji = await fetchKanji(character);
    if (!kanji) {
      rejected.push({ character, reason: 'kanjiapi.dev에서 찾지 못함' });
    } else if (!isLevelInRange(kanji.jlptLevel)) {
      rejected.push({ character, reason: `레벨이 N1~N3 범위 밖(jlpt=${kanji.jlptLevel})` });
    } else {
      accepted.push({ ...kanji, displayOrder: displayOrder++ });
    }
  }
  return { accepted, rejected };
}

async function buildVocabularyEntries(candidates) {
  const accepted = [];
  const rejected = [];
  let displayOrder = 1;
  for (const surfaceForm of candidates) {
    const word = await fetchWord(surfaceForm);
    if (!word) {
      rejected.push({ surfaceForm, reason: 'kanjiapi.dev에서 찾지 못함' });
      continue;
    }
    const jlptLevel = await computeWordJlptLevel(surfaceForm);
    if (!isLevelInRange(jlptLevel)) {
      rejected.push({ surfaceForm, reason: `레벨이 N1~N3 범위 밖(jlpt=${jlptLevel})` });
      continue;
    }
    accepted.push({ ...word, jlptLevel, displayOrder: displayOrder++ });
  }
  return { accepted, rejected };
}

const MAX_EXAMPLES = 4;

async function buildExampleEntries(vocabularyWords) {
  const accepted = [];
  const rejected = [];
  const seen = new Set();
  let displayOrder = 1;
  for (const keyword of vocabularyWords) {
    if (accepted.length >= MAX_EXAMPLES) {
      break;
    }
    const example = await searchJapaneseExample(keyword);
    if (!example || seen.has(example.japaneseSentence)) {
      rejected.push({ keyword, reason: 'Tatoeba에서 한국어 번역이 있는 예문 없음' });
      continue;
    }
    seen.add(example.japaneseSentence);
    const reading = await generateReading(example.japaneseSentence);
    accepted.push({
      ...example,
      reading,
      readingStatus: '자동 생성(검수 필요)',
      displayOrder: displayOrder++,
    });
  }
  return { accepted, rejected };
}

/** 영어 뜻을 한국어로 번역해 meaning에 넣고, 원문은 meaningEn에 남긴다. */
async function translateEntries(apiKey, kanjiEntries, vocabularyEntries) {
  const targets = [...kanjiEntries, ...vocabularyEntries];
  const items = targets.map((entry, index) => ({ id: String(index), english: entry.meaning }));
  const translated = await translateMeanings(apiKey, items);
  targets.forEach((entry, index) => {
    entry.meaningEn = entry.meaning;
    entry.meaning = translated[String(index)] ?? entry.meaning;
    entry.meaningStatus = '번역 초안(검수 필요)';
  });
}

async function main() {
  const { title, topic, candidates: candidatesPath } = parseArgs();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 없습니다. .env.example을 복사해 .env를 만들고 채워주세요.');
  }

  let candidates;
  if (candidatesPath) {
    console.log(`후보 파일 ${candidatesPath}을 사용합니다(Gemini 후보 추천 생략).`);
    candidates = JSON.parse(readFileSync(path.resolve(candidatesPath), 'utf-8'));
  } else {
    console.log(`"${title}" 테마 후보를 Gemini에게 추천받는 중...`);
    candidates = await suggestCandidates(apiKey, title, topic);
  }

  console.log('kanjiapi.dev로 한자/단어/표현을 조회·검증하는 중...');
  const kanji = await buildKanjiEntries(candidates.kanji ?? []);
  const word = await buildVocabularyEntries(candidates.word ?? []);
  const expression = await buildVocabularyEntries(candidates.expression ?? []);

  console.log('Tatoeba에서 예문을 검색하는 중...');
  const vocabularyWords = [...word.accepted, ...expression.accepted].map(
    (entry) => entry.surfaceForm,
  );
  const examples = await buildExampleEntries(vocabularyWords);

  console.log('영어 뜻을 한국어로 번역하는 중(Gemini 1회)...');
  await translateEntries(apiKey, kanji.accepted, [...word.accepted, ...expression.accepted]);

  const draft = {
    title,
    kanji: kanji.accepted,
    vocabulary: { WORD: word.accepted, EXPRESSION: expression.accepted },
    examples: examples.accepted,
    rejected: [
      ...kanji.rejected.map((item) => ({ type: 'kanji', ...item })),
      ...word.rejected.map((item) => ({ type: 'word', ...item })),
      ...expression.rejected.map((item) => ({ type: 'expression', ...item })),
      ...examples.rejected.map((item) => ({ type: 'example', ...item })),
    ],
  };

  const slug = title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  const draftsDir = path.join(CURRENT_DIR, 'drafts');
  mkdirSync(draftsDir, { recursive: true });
  const draftPath = path.join(draftsDir, `${slug}.json`);
  writeFileSync(draftPath, JSON.stringify(draft, null, 2) + '\n', 'utf-8');

  console.log(`\n초안을 ${draftPath}에 저장했습니다.`);
  console.log(
    `한자 ${draft.kanji.length}개, 단어 ${draft.vocabulary.WORD.length}개, 표현 ${draft.vocabulary.EXPRESSION.length}개, 예문 ${draft.examples.length}개 통과.`,
  );
  if (draft.rejected.length > 0) {
    console.log(`거부된 후보 ${draft.rejected.length}개(이유는 draft 파일의 "rejected" 참고).`);
  }
  console.log('초안 파일을 열어 직접 검토·수정한 뒤, 아래 명령으로 마이그레이션을 생성하세요:');
  console.log(`  npm run finalize -- --draft drafts/${slug}.json`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
