#!/usr/bin/env node
// 사용법: npm run finalize -- --draft drafts/<파일명>.json
//
// propose.mjs가 만든 초안(사람이 검토·수정한 뒤)을 받아서, 다음 번호의 Flyway 마이그레이션
// SQL 파일을 backend/src/main/resources/db/migration/에 생성한다. SQL을 직접 DB에 실행하지는
// 않는다 — 생성된 파일을 평소처럼 ./gradlew test로 띄워서 확인하고 커밋하면 된다.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const MIGRATION_DIR = path.join(
  CURRENT_DIR,
  '..',
  '..',
  'backend',
  'src',
  'main',
  'resources',
  'db',
  'migration',
);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    options[args[i].replace(/^--/, '')] = args[i + 1];
  }
  if (!options.draft) {
    throw new Error('사용법: npm run finalize -- --draft drafts/<파일명>.json');
  }
  return options;
}

function nextMigrationVersion() {
  const versions = readdirSync(MIGRATION_DIR)
    .map((filename) => filename.match(/^V(\d+)__/))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return Math.max(...versions) + 1;
}

function sqlEscape(value) {
  return value.replaceAll("'", "''");
}

function themeSubquery(title) {
  return `(SELECT id FROM themes WHERE title = '${sqlEscape(title)}')`;
}

function buildSql(draft) {
  const lines = [];
  lines.push(`-- "${draft.title}" 테마 콘텐츠. scripts/import-theme-content로 생성했다:`);
  lines.push('-- Gemini가 표기를 추천하고, kanjiapi.dev·Tatoeba로 실제 뜻/읽는 법/레벨을 조회·');
  lines.push('-- 검증한 뒤 사람이 drafts/*.json을 검토·승인한 결과다.');
  lines.push('');
  lines.push(`INSERT INTO themes (title) VALUES ('${sqlEscape(draft.title)}');`);
  lines.push('');

  if (draft.kanji.length > 0) {
    lines.push(
      'INSERT INTO theme_kanji (theme_id, kanji, on_reading, kun_reading, meaning, jlpt_level, display_order)',
    );
    lines.push('VALUES');
    lines.push(
      draft.kanji
        .map(
          (entry, index) =>
            `    (${themeSubquery(draft.title)}, '${sqlEscape(entry.kanji)}', '${sqlEscape(entry.onReading)}', '${sqlEscape(entry.kunReading)}', '${sqlEscape(entry.meaning)}', ${entry.jlptLevel}, ${entry.displayOrder})` +
            (index === draft.kanji.length - 1 ? ';' : ','),
        )
        .join('\n'),
    );
    lines.push('');
  }

  for (const [stage, entries] of Object.entries(draft.vocabulary)) {
    if (entries.length === 0) {
      continue;
    }
    lines.push(
      'INSERT INTO theme_vocabulary (theme_id, stage, surface_form, reading, meaning, jlpt_level, display_order)',
    );
    lines.push('VALUES');
    lines.push(
      entries
        .map(
          (entry, index) =>
            `    (${themeSubquery(draft.title)}, '${stage}', '${sqlEscape(entry.surfaceForm)}', '${sqlEscape(entry.reading)}', '${sqlEscape(entry.meaning)}', ${entry.jlptLevel}, ${entry.displayOrder})` +
            (index === entries.length - 1 ? ';' : ','),
        )
        .join('\n'),
    );
    lines.push('');
  }

  if (draft.examples.length > 0) {
    lines.push(
      'INSERT INTO theme_example (theme_id, japanese_sentence, translation, reading, display_order)',
    );
    lines.push('VALUES');
    lines.push(
      draft.examples
        .map(
          (entry, index) =>
            `    (${themeSubquery(draft.title)}, '${sqlEscape(entry.japaneseSentence)}', '${sqlEscape(entry.translation)}', '${sqlEscape(entry.reading)}', ${entry.displayOrder})` +
            (index === draft.examples.length - 1 ? ';' : ','),
        )
        .join('\n'),
    );
  }

  return lines.join('\n') + '\n';
}

function main() {
  const { draft: draftPath } = parseArgs();
  const draft = JSON.parse(readFileSync(path.resolve(draftPath), 'utf-8'));

  const version = nextMigrationVersion();
  const slug = draft.title.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '');
  const filename = `V${version}__add_theme_${slug}.sql`;
  const outputPath = path.join(MIGRATION_DIR, filename);

  writeFileSync(outputPath, buildSql(draft), 'utf-8');

  console.log(`생성됨: ${outputPath}`);
  console.log('다음으로 할 일:');
  console.log('  1. 생성된 SQL 파일을 직접 한 번 읽어보고 이상한 부분이 없는지 확인');
  console.log('  2. cd backend && ./gradlew spotlessApply test 로 실제로 적용·검증');
}

main();
