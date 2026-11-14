#!/usr/bin/env node
// 사용법: npm run import -- [--themes "테마1,테마2"] [--csv-dir <폴더>] [--accept-mismatch]
//
// 구글 시트(웹 게시 CSV 4개: themes, kanji, vocabulary, examples)를 읽어 검토용 Flyway SQL을 만든다.
// - review 열이 "ok"인 행만 반영한다("draft" 행은 건너뜀).
// - 한자·단어의 읽는 법/JLPT 레벨을 kanjiapi.dev와 대조해, 다르면 SQL을 만들지 않고 멈춘다.
//   의도해서 다르게 적은 것이면 --accept-mismatch로 확인하고 넘어간다. 예문 읽는 법은
//   자동 대조가 불가능(사람이 고친 값이 정답)해서 대조하지 않는다.
// - DB에는 직접 쓰지 않는다. 생성된 SQL을 사람이 읽어보고 커밋한다.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './lib/csv.mjs';
import { computeWordJlptLevel, fetchKanji, fetchWordReadings } from './lib/kanjiApi.mjs';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(CURRENT_DIR, '..', '..');
const MIGRATION_DIR = path.join(REPO_ROOT, 'backend', 'src', 'main', 'resources', 'db', 'migration');
const MIGRATION_GIT_PATH = 'backend/src/main/resources/db/migration';
const FETCH_TIMEOUT_MS = 15000;
const MIN_JLPT_LEVEL = 1;
const MAX_JLPT_LEVEL = 3;
const STAGES = ['WORD', 'EXPRESSION'];

const TABS = {
  themes: { env: 'THEME_SHEET_THEMES_CSV_URL', headers: ['title', 'topic'] },
  kanji: {
    env: 'THEME_SHEET_KANJI_CSV_URL',
    headers: ['theme', 'kanji', 'on_reading', 'kun_reading', 'meaning', 'jlpt_level', 'display_order', 'review'],
  },
  vocabulary: {
    env: 'THEME_SHEET_VOCABULARY_CSV_URL',
    headers: ['theme', 'stage', 'surface_form', 'reading', 'meaning', 'jlpt_level', 'display_order', 'review'],
  },
  examples: {
    env: 'THEME_SHEET_EXAMPLES_CSV_URL',
    headers: ['theme', 'japanese_sentence', 'reading', 'translation', 'display_order', 'review'],
  },
};
// DB 열 길이(V7, V10 마이그레이션 기준)
const MAX_LENGTH = { kanji: 4, reading: 100, meaning: 200, surface: 100, sentence: 300, title: 100 };

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { acceptMismatch: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--accept-mismatch') {
      options.acceptMismatch = true;
    } else if (args[i] === '--themes' && args[i + 1]) {
      options.themes = args[++i].split(',').map((title) => title.trim());
    } else if (args[i] === '--csv-dir' && args[i + 1]) {
      options.csvDir = args[++i];
    } else {
      throw new Error('사용법: npm run import -- [--themes "a,b"] [--csv-dir <폴더>] [--accept-mismatch]');
    }
  }
  return options;
}

async function loadTab(name, options) {
  let text;
  if (options.csvDir) {
    text = readFileSync(path.join(options.csvDir, `${name}.csv`), 'utf8');
  } else {
    const url = process.env[TABS[name].env];
    if (!url) {
      throw new Error(`${TABS[name].env}가 없다. .env에 넣거나 --csv-dir 을 사용한다.`);
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`${name} 탭 CSV를 가져오지 못했다: HTTP ${response.status}`);
    }
    text = await response.text();
  }
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ''));
  const header = rows[0]?.map((cell) => cell.trim()) ?? [];
  const expected = TABS[name].headers;
  if (header.length !== expected.length || !expected.every((h) => header.includes(h))) {
    throw new Error(`${name} 탭의 헤더가 ${expected.join(', ')} 이어야 한다(현재: ${header.join(', ')})`);
  }
  return rows.slice(1).map((row, index) => {
    const values = Object.fromEntries(header.map((h, i) => [h, (row[i] ?? '').trim()]));
    return { ...values, _line: index + 2, _tab: name };
  });
}

function where(row) {
  return `${row._tab} 탭 ${row._line}행`;
}

function requireFields(row, fields, errors) {
  for (const field of fields) {
    if (row[field] === '') {
      errors.push(`${where(row)}: ${field}가 비어 있다`);
    }
  }
}

function checkInteger(row, field, errors) {
  if (!/^[1-9][0-9]*$/.test(row[field])) {
    errors.push(`${where(row)}: ${field} '${row[field]}'는 양의 정수여야 한다`);
  }
}

function checkLength(row, field, max, errors) {
  if (Array.from(row[field]).length > max) {
    errors.push(`${where(row)}: ${field}가 ${max}자를 넘는다`);
  }
}

function checkCommon(row, themeTitles, errors) {
  requireFields(row, ['theme', 'review', 'display_order'], errors);
  if (row.theme !== '' && !themeTitles.has(row.theme)) {
    errors.push(`${where(row)}: theme '${row.theme}'가 themes 탭에 없다`);
  }
  if (!['draft', 'ok'].includes(row.review)) {
    errors.push(`${where(row)}: review는 draft 또는 ok여야 한다(현재: '${row.review}')`);
  }
  checkInteger(row, 'display_order', errors);
}

function checkLevel(row, errors) {
  const level = Number(row.jlpt_level);
  if (!Number.isInteger(level) || level < MIN_JLPT_LEVEL || level > MAX_JLPT_LEVEL) {
    errors.push(`${where(row)}: jlpt_level '${row.jlpt_level}'는 N1~N3(1~3) 범위여야 한다`);
  }
}

// 형식 검사. 문제는 errors에 모은다.
function validate(data) {
  const errors = [];
  const themeTitles = new Set(data.themes.map((row) => row.title));
  data.themes.forEach((row) => {
    requireFields(row, ['title'], errors);
    checkLength(row, 'title', MAX_LENGTH.title, errors);
  });
  const seen = new Set();
  const dup = (row, key) => {
    const id = `${row._tab}|${row.theme}|${key}`;
    if (seen.has(id)) {
      errors.push(`${where(row)}: 같은 테마에 '${key}'가 중복이다`);
    }
    seen.add(id);
  };
  for (const row of data.kanji) {
    checkCommon(row, themeTitles, errors);
    requireFields(row, ['kanji', 'on_reading', 'meaning', 'jlpt_level'], errors);
    checkLength(row, 'kanji', MAX_LENGTH.kanji, errors);
    checkLength(row, 'on_reading', MAX_LENGTH.reading, errors);
    checkLength(row, 'kun_reading', MAX_LENGTH.reading, errors);
    checkLength(row, 'meaning', MAX_LENGTH.meaning, errors);
    checkLevel(row, errors);
    dup(row, row.kanji);
  }
  for (const row of data.vocabulary) {
    checkCommon(row, themeTitles, errors);
    requireFields(row, ['stage', 'surface_form', 'reading', 'meaning', 'jlpt_level'], errors);
    if (!STAGES.includes(row.stage)) {
      errors.push(`${where(row)}: stage는 WORD 또는 EXPRESSION이어야 한다(현재: '${row.stage}')`);
    }
    checkLength(row, 'surface_form', MAX_LENGTH.surface, errors);
    checkLength(row, 'reading', MAX_LENGTH.reading, errors);
    checkLength(row, 'meaning', MAX_LENGTH.meaning, errors);
    checkLevel(row, errors);
    dup(row, `${row.stage}:${row.surface_form}`);
  }
  for (const row of data.examples) {
    checkCommon(row, themeTitles, errors);
    requireFields(row, ['japanese_sentence', 'reading', 'translation'], errors);
    checkLength(row, 'japanese_sentence', MAX_LENGTH.sentence, errors);
    checkLength(row, 'reading', MAX_LENGTH.sentence, errors);
    checkLength(row, 'translation', MAX_LENGTH.sentence, errors);
    dup(row, row.japanese_sentence);
  }
  return errors;
}

const splitReadings = (text) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .sort()
    .join(', ');

// kanjiapi.dev와 대조한다. 시트 값이 사전과 다르면 mismatches에 모은다.
async function compareWithDictionary(kanjiRows, vocabularyRows) {
  const mismatches = [];
  for (const row of kanjiRows) {
    const api = await fetchKanji(row.kanji);
    if (!api) {
      mismatches.push(`${where(row)}: 한자 '${row.kanji}'가 kanjiapi.dev에 없다`);
      continue;
    }
    if (splitReadings(api.onReading) !== splitReadings(row.on_reading)) {
      mismatches.push(`${where(row)}: ${row.kanji} 음독 시트='${row.on_reading}' 사전='${api.onReading}'`);
    }
    if (splitReadings(api.kunReading) !== splitReadings(row.kun_reading)) {
      mismatches.push(`${where(row)}: ${row.kanji} 훈독 시트='${row.kun_reading}' 사전='${api.kunReading}'`);
    }
    if (api.jlptLevel !== Number(row.jlpt_level)) {
      mismatches.push(`${where(row)}: ${row.kanji} 레벨 시트=${row.jlpt_level} 사전=${api.jlptLevel}`);
    }
  }
  for (const row of vocabularyRows) {
    const readings = await fetchWordReadings(row.surface_form);
    if (readings.length === 0) {
      mismatches.push(`${where(row)}: '${row.surface_form}'가 kanjiapi.dev 단어 사전에 없다`);
    } else if (!readings.includes(row.reading)) {
      mismatches.push(
        `${where(row)}: ${row.surface_form} 읽는 법 시트='${row.reading}' 사전=${[...new Set(readings)].join(' / ')}`,
      );
    }
    const level = await computeWordJlptLevel(row.surface_form);
    if (level !== Number(row.jlpt_level)) {
      mismatches.push(`${where(row)}: ${row.surface_form} 레벨 시트=${row.jlpt_level} 사전 계산=${level}`);
    }
  }
  return mismatches;
}

function nextMigrationVersion() {
  const names = readdirSync(MIGRATION_DIR);
  try {
    // 다른 브랜치와 번호가 겹치지 않게 origin/master의 마이그레이션 번호도 본다(git fetch는 미리 해 둔다).
    const remote = execFileSync(
      'git',
      ['ls-tree', '-r', '--name-only', 'origin/master', MIGRATION_GIT_PATH],
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    names.push(...remote.split('\n').map((line) => path.basename(line)));
  } catch {
    console.warn('경고: origin/master를 읽지 못해 로컬 마이그레이션 번호만 본다.');
  }
  const versions = names.map((n) => n.match(/^V(\d+)__/)).filter(Boolean).map((m) => Number(m[1]));
  return Math.max(...versions) + 1;
}

const esc = (value) => value.replaceAll("'", "''");

// 테마 하나를 "없으면 만들고, 내용은 지우고 다시 넣는" 멱등 SQL로 만든다.
function buildThemeSql(title, kanji, vocabulary, examples) {
  const theme = `(SELECT id FROM themes WHERE title = '${esc(title)}')`;
  const lines = [`-- ${title}`];
  lines.push(`INSERT INTO themes (title) VALUES ('${esc(title)}') ON CONFLICT (title) DO NOTHING;`);
  for (const table of ['theme_kanji', 'theme_vocabulary', 'theme_example']) {
    lines.push(`DELETE FROM ${table} WHERE theme_id = ${theme};`);
  }
  const insert = (head, rows) => {
    if (rows.length > 0) {
      lines.push('', head, 'VALUES', rows.map((r) => `    (${theme}, ${r})`).join(',\n') + ';');
    }
  };
  const byOrder = (a, b) => Number(a.display_order) - Number(b.display_order);
  insert(
    'INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)',
    [...kanji].sort(byOrder).map(
      (r) => `'${esc(r.kanji)}', '${esc(r.on_reading)}', '${esc(r.kun_reading)}', '${esc(r.meaning)}', ${r.jlpt_level}, ${r.display_order}`,
    ),
  );
  insert(
    'INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)',
    [...vocabulary].sort(byOrder).map(
      (r) => `'${r.stage}', '${esc(r.surface_form)}', '${esc(r.reading)}', '${esc(r.meaning)}', ${r.jlpt_level}, ${r.display_order}`,
    ),
  );
  insert(
    'INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)',
    [...examples].sort(byOrder).map(
      (r) => `'${esc(r.japanese_sentence)}', '${esc(r.translation)}', '${esc(r.reading)}', ${r.display_order}`,
    ),
  );
  return lines.join('\n');
}

async function main() {
  const options = parseArgs();
  const data = {};
  for (const name of Object.keys(TABS)) {
    data[name] = await loadTab(name, options);
  }

  const errors = validate(data);
  if (errors.length > 0) {
    throw new Error(`시트에 고칠 곳이 있다:\n - ${errors.join('\n - ')}`);
  }

  const approved = (rows) => rows.filter((row) => row.review === 'ok');
  const skipped = ['kanji', 'vocabulary', 'examples'].reduce(
    (sum, name) => sum + data[name].length - approved(data[name]).length,
    0,
  );
  let titles = data.themes.map((row) => row.title);
  if (options.themes) {
    const unknown = options.themes.filter((title) => !titles.includes(title));
    if (unknown.length > 0) {
      throw new Error(`themes 탭에 없는 테마: ${unknown.join(', ')}`);
    }
    titles = options.themes;
  }
  const picked = titles.filter((title) =>
    ['kanji', 'vocabulary', 'examples'].some((name) =>
      approved(data[name]).some((row) => row.theme === title),
    ),
  );
  if (picked.length === 0) {
    throw new Error('review가 ok인 행이 있는 테마가 없다. 시트에서 검수한 행을 ok로 바꿔주세요.');
  }

  const forTheme = (name, title) =>
    approved(data[name]).filter((row) => row.theme === title);
  console.log('kanjiapi.dev와 대조하는 중...');
  const mismatches = [];
  for (const title of picked) {
    mismatches.push(...(await compareWithDictionary(forTheme('kanji', title), forTheme('vocabulary', title))));
  }
  if (mismatches.length > 0) {
    console.warn(`\n사전과 다른 값 ${mismatches.length}개:\n - ${mismatches.join('\n - ')}`);
    if (!options.acceptMismatch) {
      throw new Error('시트를 고치거나, 의도한 값이면 --accept-mismatch로 다시 실행하세요. SQL은 만들지 않았다.');
    }
    console.warn('--accept-mismatch: 위 값들을 확인하고 그대로 진행한다.');
  }

  const header = [
    '-- 테마 학습 콘텐츠. 구글 시트(kotonoha-machi 테마 콘텐츠)에서 사람이 검수(review=ok)한 행을',
    '-- scripts/import-theme-content의 import-sheet.mjs가 kanjiapi.dev와 대조한 뒤 만들었다.',
    '-- 테마별로 기존 내용을 지우고 다시 넣는다(같은 테마를 시트에서 고쳐 새 버전으로 반영할 수 있음).',
  ];
  const body = picked.map((title) =>
    buildThemeSql(title, forTheme('kanji', title), forTheme('vocabulary', title), forTheme('examples', title)),
  );
  const version = nextMigrationVersion();
  const slug = picked.length === 1 ? picked[0].replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '') : `${picked.length}_themes`;
  const outputPath = path.join(MIGRATION_DIR, `V${version}__upsert_theme_${slug}.sql`);
  writeFileSync(outputPath, [...header, '', body.join('\n\n')].join('\n') + '\n', 'utf8');

  console.log(`\n테마 ${picked.length}개 반영, review가 draft인 ${skipped}행은 건너뜀.`);
  console.log(`생성됨: ${outputPath}`);
  console.log('SQL을 직접 읽어보고 cd backend && ./gradlew spotlessApply test 로 검증한 뒤 커밋하세요.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
