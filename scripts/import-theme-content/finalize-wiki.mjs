#!/usr/bin/env node
// 사용법: npm run finalize-wiki -- [--draft drafts/wiki/<파일>.json | --all] [--first-version 40]
// 위키백과 지문 학습 초안을 Flyway 마이그레이션 SQL로 만든다(학습 하나당 파일 하나). DB에 직접 실행하지 않는다.
// 저장 형식은 세션 B와 맞춘 약속: theme_reading_passage(+source_title/source_url/license/is_excerpt, translation NULL),
// theme_reading_question(question, choice_1~4, answer_index, explanation, display_order).
// 보류(status) 학습, 번역 전 뜻, 문제가 부족한 학습은 만들지 않고 이유를 출력한다.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(CURRENT_DIR, '..', '..');
const MIGRATION_DIR = path.join(REPO_ROOT, 'backend', 'src', 'main', 'resources', 'db', 'migration');
const DRAFT_DIR = path.join(CURRENT_DIR, 'drafts', 'wiki');
const B_SCHEMA_VERSION = 39; // 세션 B가 올릴 스키마 마이그레이션. 그 다음 번호부터 쓴다.
const MIN_QUESTIONS = 2;

const args = process.argv.slice(2);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);

const q = (v) => `'${String(v).replaceAll("'", "''")}'`;

function usedVersions() {
  const names = readdirSync(MIGRATION_DIR);
  try {
    names.push(
      ...execSync('git ls-tree -r origin/master --name-only', { cwd: REPO_ROOT, encoding: 'utf8' })
        .split('\n').map((f) => path.basename(f)),
    );
  } catch { /* origin/master를 못 읽으면 로컬만 본다 */ }
  return names.map((n) => n.match(/^V(\d+)__/)).filter(Boolean).map((m) => Number(m[1]));
}

/** 만들 수 없는 이유가 있으면 문자열 목록으로 돌려준다. */
function problems(d) {
  const list = [];
  if (d.status === '보류') list.push('보류 상태');
  if ((d.questions ?? []).length < MIN_QUESTIONS) list.push(`이해 문제 ${(d.questions ?? []).length}개(최소 ${MIN_QUESTIONS})`);
  const untranslated = [...d.kanji, ...Object.values(d.vocabulary).flat()].filter((e) => e.meaningStatus?.startsWith('번역 전'));
  if (untranslated.length) list.push(`뜻이 번역 전인 항목 ${untranslated.length}개(npm run draft -- --translate)`);
  if (d.kanji.length === 0) list.push('한자 없음');
  return list;
}

function buildSql(d) {
  const t = `(SELECT id FROM themes WHERE title = ${q(d.title)})`;
  const examples = d.examples.filter((e) => e.translation);
  const dropped = d.examples.length - examples.length;
  const L = [];
  L.push(`-- 오늘의 학습 「${d.title}」. 일본어 위키백과 도입 단락(괄호 설명 삭제)을 지문으로 쓴다.`);
  L.push(`-- 출처: ${d.passage.sourceUrl} (${d.passage.license}). scripts/import-theme-content로 생성:`);
  L.push('-- 한자·단어·표현은 kanjiapi.dev(뜻은 영어를 Gemini가 한국어로 번역), 예문은 Tatoeba, 이해 문제는 Gemini가 만들고 재검증했다.');
  L.push('');
  L.push(`INSERT INTO themes (title) VALUES (${q(d.title)}) ON CONFLICT (title) DO NOTHING;`);
  for (const table of ['theme_kanji', 'theme_vocabulary', 'theme_example', 'theme_reading_passage']) {
    L.push(`DELETE FROM ${table} WHERE theme_id = ${t};`); // 지문을 지우면 문제도 같이 지워진다(ON DELETE CASCADE)
  }
  L.push('');
  L.push('INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)', 'VALUES');
  L.push(d.kanji.map((k) => `    (${t}, ${q(k.kanji)}, ${q(k.onReading)}, ${q(k.kunReading)}, ${q(k.meaning)}, ${k.jlptLevel}, ${k.displayOrder})`).join(',\n') + ';', '');
  for (const [stage, entries] of Object.entries(d.vocabulary)) {
    if (!entries.length) continue;
    L.push('INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)', 'VALUES');
    L.push(entries.map((w) => `    (${t}, ${q(stage)}, ${q(w.surfaceForm)}, ${q(w.reading)}, ${q(w.meaning)}, ${w.jlptLevel}, ${w.displayOrder})`).join(',\n') + ';', '');
  }
  if (examples.length) {
    L.push('INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)', 'VALUES');
    L.push(examples.map((e, i) => `    (${t}, ${q(e.japaneseSentence)}, ${q(e.translation)}, ${q(e.reading)}, ${i + 1})`).join(',\n') + ';', '');
  }
  const level = Math.min(...d.kanji.map((k) => k.jlptLevel));
  L.push('INSERT INTO theme_reading_passage (theme_id, jlpt_level, passage, translation, display_order, source_title, source_url, license, is_excerpt)', 'VALUES');
  L.push(`    (${t}, ${level}, ${q(d.passage.text)}, NULL, 1, ${q(d.passage.sourceTitle)}, ${q(d.passage.sourceUrl)}, ${q(d.passage.license)}, ${d.passage.isExcerpt ? 'true' : 'false'});`, '');
  const passageId = `(SELECT id FROM theme_reading_passage WHERE theme_id = ${t} AND display_order = 1)`;
  L.push('INSERT INTO theme_reading_question (passage_id, question, choice_1, choice_2, choice_3, choice_4, answer_index, explanation, display_order)', 'VALUES');
  L.push(d.questions.map((x, i) => `    (${passageId}, ${q(x.question)}, ${x.choices.map(q).join(', ')}, ${x.answerIndex}, ${q(x.explanation)}, ${i + 1})`).join(',\n') + ';');
  return { sql: L.join('\n') + '\n', dropped };
}

const files = opt('--draft') ? [path.resolve(opt('--draft'))] : args.includes('--all')
  ? readdirSync(DRAFT_DIR).filter((f) => f.endsWith('.json')).map((f) => path.join(DRAFT_DIR, f))
  : (() => { throw new Error('사용법: npm run finalize-wiki -- --all  또는  --draft drafts/wiki/<파일>.json'); })();

let version = Math.max(...usedVersions(), B_SCHEMA_VERSION, Number(opt('--first-version') ?? 0) - 1) + 1;
let made = 0;
for (const file of files) {
  const d = JSON.parse(readFileSync(file, 'utf8'));
  const why = problems(d);
  if (why.length) {
    console.log(`건너뜀 「${d.title}」: ${why.join(', ')}`);
    continue;
  }
  const { sql, dropped } = buildSql(d);
  const name = `V${version}__upsert_lesson_${d.title.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '')}.sql`;
  writeFileSync(path.join(MIGRATION_DIR, name), sql);
  version++;
  made++;
  console.log(`\n생성 ${name}`);
  console.log(`확인 필요 ${d.suspects?.length ?? 0}건${dropped ? ` (번역 없는 예문 ${dropped}개 제외)` : ''}:`);
  for (const s of d.suspects ?? []) console.log(`  - ${s}`);
}
console.log(`\n마이그레이션 ${made}개 생성(DB 적용은 B의 스키마가 master에 올라온 뒤 확인).`);
