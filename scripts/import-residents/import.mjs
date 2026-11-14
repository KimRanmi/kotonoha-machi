// 구글 시트(웹 게시 CSV)의 주민 페르소나를 읽어 검토용 Flyway SQL을 생성한다.
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
const REQUIRED = ['id', 'name', 'personality', 'appearance_job', 'core_features'];
const OPTIONAL = ['hobby', 'location', 'gender'];
// 시트의 성별 값 -> DB 값. 목소리와 대화 말투를 정하는 데 쓴다.
const GENDER_CODES = { 남: 'M', 여: 'F' };
const MAX_LENGTH = { name: 50, personality: 30, background: 500, location: 30 };
// 시트에 없는 값의 공통 기본 문장. 나중에 대화 시작 시 실제 위치로 덮어쓸 예정이다.
const DEFAULT_CONTEXT = '마을에서 평소처럼 하루를 보내고 있다.';
const NAME_PATTERN = /\(([^()]*)\)\s*$/;

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
  const url = process.env.RESIDENT_SHEET_CSV_URL;
  if (!url) {
    throw new Error('RESIDENT_SHEET_CSV_URL이 없다. .env를 만들거나 --csv 를 사용한다.');
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

// 시트 한 행을 DB 열 형태로 변환한다. 문제는 rowErrors에 모은다.
function toResident(values, rowErrors) {
  const resident = {
    slug: '',
    name: '',
    personality: values.personality,
    current_context: DEFAULT_CONTEXT,
    speech_style: '',
    background: '',
    sample_lines: '',
    location: values.location === '' ? null : values.location,
    gender: null,
  };
  if (values.gender !== '') {
    resident.gender = GENDER_CODES[values.gender] ?? null;
    if (resident.gender === null) {
      rowErrors.push(`gender '${values.gender}'는 '남' 또는 '여'여야 한다`);
    }
  }
  for (const key of REQUIRED) {
    if (values[key] === '') {
      rowErrors.push(`${key}가 비어 있다`);
    }
  }
  if (values.id !== '') {
    if (!/^[1-9][0-9]*$/.test(values.id)) {
      rowErrors.push(`id '${values.id}'는 양의 정수여야 한다`);
    } else {
      resident.slug = `r${values.id.padStart(2, '0')}`;
    }
  }
  if (values.name !== '') {
    const japanese = values.name.match(NAME_PATTERN)?.[1].trim();
    if (!japanese) {
      rowErrors.push(`name '${values.name}'에서 괄호 안 일본어 이름을 찾을 수 없다`);
    } else {
      resident.name = japanese;
    }
  }
  resident.background =
    `외모·직업: ${values.appearance_job}\n` +
    `핵심 특징: ${values.core_features}\n` +
    `취미: ${values.hobby}`;
  return resident;
}

// 헤더를 검증하고, 데이터 행을 변환해 돌려준다. 문제는 errors에 모은다.
function validate(rows) {
  const errors = [];
  if (rows.length === 0) {
    return { errors: ['CSV가 비어 있다.'], residents: [], includeLocation: false, includeGender: false };
  }
  const header = rows[0].map((h) => h.trim());
  const allowed = [...REQUIRED, ...OPTIONAL];
  for (const h of header) {
    if (!allowed.includes(h)) {
      errors.push(`헤더: 알 수 없는 열 '${h}'`);
    }
  }
  for (const h of REQUIRED) {
    if (!header.includes(h)) {
      errors.push(`헤더: 필수 열 '${h}'가 없다`);
    }
  }
  if (new Set(header).size !== header.length) {
    errors.push('헤더: 중복된 열 이름이 있다');
  }
  if (errors.length > 0) {
    return { errors, residents: [], includeLocation: false, includeGender: false };
  }

  const residents = [];
  const seenSlugs = new Map();
  rows.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2; // 시트 기준(헤더가 1행)
    if (cells.every((c) => c.trim() === '')) {
      return;
    }
    const values = {};
    for (const key of allowed) {
      const col = header.indexOf(key);
      values[key] = col >= 0 && cells[col] !== undefined ? cells[col].trim() : '';
    }
    const rowErrors = [];
    for (const key of allowed) {
      if (/[{}]/.test(values[key])) {
        rowErrors.push(`${key}에 '{' 또는 '}'를 쓸 수 없다`);
      }
    }
    const resident = toResident(values, rowErrors);
    if (resident.slug !== '') {
      if (seenSlugs.has(resident.slug)) {
        rowErrors.push(`id '${values.id}'가 ${seenSlugs.get(resident.slug)}행과 중복된다`);
      } else {
        seenSlugs.set(resident.slug, rowNumber);
      }
    }
    for (const [key, max] of Object.entries(MAX_LENGTH)) {
      const length = [...resident[key]].length;
      if (length > max) {
        rowErrors.push(`${key}(변환 후)가 ${max}자를 넘는다 (${length}자)`);
      }
    }
    rowErrors.forEach((e) => errors.push(`${rowNumber}행: ${e}`));
    residents.push(resident);
  });
  if (residents.length === 0) {
    errors.push('데이터 행이 0개다.');
  }
  return {
    errors,
    residents,
    includeLocation: header.includes('location'),
    includeGender: header.includes('gender'),
  };
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

function buildSql(residents, includeLocation, includeGender) {
  const columns = [
    'slug',
    'name',
    'personality',
    'current_context',
    'speech_style',
    'background',
    'sample_lines',
  ];
  // 시트에 location 열이 없으면 resident.location을 건드리지 않는다(있던 장소가 지워지지 않게).
  if (includeLocation) {
    columns.push('location');
  }
  // 성별 열도 마찬가지다.
  if (includeGender) {
    columns.push('gender');
  }
  const updatable = columns.filter((c) => c !== 'slug');
  const header =
    '-- scripts/import-residents 가 구글 시트에서 생성한 주민 페르소나 upsert. 검토 후 커밋한다.\n' +
    '-- 시트에서 지운 주민은 삭제하지 않는다.\n';
  const statements = residents.map((r) => {
    const values = columns
      .map((c) => (r[c] === null ? 'NULL' : `'${sqlEscape(r[c])}'`))
      .join(', ');
    const sets = updatable.map((c) => `${c} = EXCLUDED.${c}`).join(', ');
    return (
      `INSERT INTO resident (${columns.join(', ')})\n` +
      `VALUES (${values})\n` +
      `ON CONFLICT (slug) DO UPDATE SET ${sets};\n`
    );
  });
  return header + '\n' + statements.join('\n');
}

async function main() {
  const options = parseArgs();
  const rows = parseCsv(await loadCsvText(options));
  const { errors, residents, includeLocation, includeGender } = validate(rows);
  if (errors.length > 0) {
    console.error('검증 실패 (파일을 만들지 않았다):');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  const filename = `V${nextMigrationVersion()}__upsert_residents.sql`;
  const outputPath = path.join(MIGRATION_DIR, filename);
  writeFileSync(outputPath, buildSql(residents, includeLocation, includeGender), 'utf8');
  console.log(`생성: ${outputPath}`);
  console.log(`대상 slug ${residents.length}개 (이미 있으면 갱신, 없으면 추가):`);
  residents.forEach((r) => console.log(`  - ${r.slug} (${r.name})`));
  console.log('SQL을 직접 검토한 뒤 커밋한다. DB에는 아직 아무것도 쓰지 않았다.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
