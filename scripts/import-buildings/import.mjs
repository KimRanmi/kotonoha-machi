// 구글 시트(웹 게시 CSV)의 마을 건물 정보를 읽어 검토용 Flyway SQL을 생성한다.
// DB에는 직접 쓰지 않는다. 생성된 SQL을 사람이 검토한 뒤 커밋한다.
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

const FETCH_TIMEOUT_MS = 15000;
const COLUMNS = ['id', 'label', 'x', 'z', 'width', 'depth', 'height', 'color'];
const NUMBER_COLUMNS = ['x', 'z', 'width', 'depth', 'height'];
const POSITIVE_COLUMNS = ['width', 'depth', 'height'];
const SLUG_PATTERN = /^[a-z][a-z0-9_]{0,19}$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const LABEL_MAX_LENGTH = 20;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] !== '--csv' || !args[i + 1]) {
      throw new Error('사용법: npm run import -- [--csv <로컬 CSV 경로>]');
    }
    options.csv = args[i + 1];
  }
  return options;
}

async function loadCsvText(options) {
  if (options.csv) {
    return readFileSync(options.csv, 'utf8');
  }
  const url = process.env.BUILDING_SHEET_CSV_URL;
  if (!url) {
    throw new Error('BUILDING_SHEET_CSV_URL이 없다. .env를 만들거나 --csv 를 사용한다.');
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`CSV를 가져오지 못했다: HTTP ${response.status}`);
  }
  return response.text();
}

// 따옴표로 감싼 필드 안의 쉼표/줄바꿈/이중 따옴표("")를 처리하는 CSV 파서.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const source = text.replace(/^﻿/, '');
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (inQuotes) {
    throw new Error('CSV 따옴표가 닫히지 않았다.');
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// 시트 한 행을 DB 열 형태로 검증·변환한다. 문제는 rowErrors에 모은다.
function toBuilding(values, rowErrors) {
  const building = { slug: values.id, label: values.label, color: values.color.toUpperCase() };
  for (const key of COLUMNS) {
    if (values[key] === '') {
      rowErrors.push(`${key}가 비어 있다`);
    }
  }
  if (values.id !== '' && !SLUG_PATTERN.test(values.id)) {
    rowErrors.push(`id '${values.id}'는 영문 소문자로 시작하는 소문자·숫자·_ 20자 이내여야 한다`);
  }
  if ([...values.label].length > LABEL_MAX_LENGTH) {
    rowErrors.push(`label이 ${LABEL_MAX_LENGTH}자를 넘는다`);
  }
  if (values.color !== '' && !COLOR_PATTERN.test(values.color)) {
    rowErrors.push(`color '${values.color}'는 #RRGGBB 형식이어야 한다`);
  }
  for (const key of NUMBER_COLUMNS) {
    if (values[key] === '') {
      continue;
    }
    const number = Number(values[key]);
    if (!Number.isFinite(number)) {
      rowErrors.push(`${key} '${values[key]}'는 숫자여야 한다`);
    } else if (POSITIVE_COLUMNS.includes(key) && number <= 0) {
      rowErrors.push(`${key}는 0보다 커야 한다`);
    } else {
      building[key] = number;
    }
  }
  return building;
}

// 헤더를 검증하고, 데이터 행을 변환해 돌려준다. 문제는 errors에 모은다.
function validate(rows) {
  const errors = [];
  if (rows.length === 0) {
    return { errors: ['CSV가 비어 있다.'], buildings: [] };
  }
  const header = rows[0].map((h) => h.trim());
  for (const h of header) {
    if (!COLUMNS.includes(h)) {
      errors.push(`헤더: 알 수 없는 열 '${h}'`);
    }
  }
  for (const h of COLUMNS) {
    if (!header.includes(h)) {
      errors.push(`헤더: 필수 열 '${h}'가 없다`);
    }
  }
  if (new Set(header).size !== header.length) {
    errors.push('헤더: 중복된 열 이름이 있다');
  }
  if (errors.length > 0) {
    return { errors, buildings: [] };
  }

  const buildings = [];
  const seenSlugs = new Map();
  rows.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2; // 시트 기준(헤더가 1행)
    if (cells.every((c) => c.trim() === '')) {
      return;
    }
    const values = {};
    for (const key of COLUMNS) {
      const col = header.indexOf(key);
      values[key] = cells[col] !== undefined ? cells[col].trim() : '';
    }
    const rowErrors = [];
    const building = toBuilding(values, rowErrors);
    if (values.id !== '') {
      if (seenSlugs.has(values.id)) {
        rowErrors.push(`id '${values.id}'가 ${seenSlugs.get(values.id)}행과 중복된다`);
      } else {
        seenSlugs.set(values.id, rowNumber);
      }
    }
    rowErrors.forEach((e) => errors.push(`${rowNumber}행: ${e}`));
    buildings.push(building);
  });
  if (buildings.length === 0) {
    errors.push('데이터 행이 0개다.');
  }
  return { errors, buildings };
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

function buildSql(buildings) {
  const columns = ['slug', 'label', 'x', 'z', 'width', 'depth', 'height', 'color'];
  const updatable = columns.filter((c) => c !== 'slug');
  const header =
    '-- scripts/import-buildings 가 구글 시트에서 생성한 마을 건물 upsert. 검토 후 커밋한다.\n' +
    '-- 시트에서 지운 건물은 삭제하지 않는다.\n';
  const statements = buildings.map((b) => {
    const values = columns
      .map((c) => (typeof b[c] === 'number' ? String(b[c]) : `'${sqlEscape(b[c])}'`))
      .join(', ');
    const sets = updatable.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    return (
      `INSERT INTO building (${columns.join(', ')})\n` +
      `VALUES (${values})\n` +
      `ON CONFLICT (slug) DO UPDATE SET ${sets};\n`
    );
  });
  return header + '\n' + statements.join('\n');
}

async function main() {
  const options = parseArgs();
  const rows = parseCsv(await loadCsvText(options));
  const { errors, buildings } = validate(rows);
  if (errors.length > 0) {
    console.error('검증 실패 (파일을 만들지 않았다):');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  const filename = `V${nextMigrationVersion()}__upsert_buildings.sql`;
  const outputPath = path.join(MIGRATION_DIR, filename);
  writeFileSync(outputPath, buildSql(buildings), 'utf8');
  console.log(`생성: ${outputPath}`);
  console.log(`대상 건물 ${buildings.length}개 (이미 있으면 갱신, 없으면 추가):`);
  buildings.forEach((b) => console.log(`  - ${b.slug} (${b.label})`));
  console.log('SQL을 직접 검토한 뒤 커밋한다. DB에는 아직 아무것도 쓰지 않았다.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
