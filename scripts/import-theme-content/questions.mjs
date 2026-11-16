#!/usr/bin/env node
// 사용법: npm run questions -- [--redo]
// drafts/wiki/*.json 중 questions가 비어 있는 학습의 이해 문제를 만든다(Gemini 무료 한도 절약: 지문 5개씩 묶어 호출).
//  1. 생성: 지문마다 JLPT N1~N3 객관식 3개(질문·보기 일본어, 해설 한국어)
//  2. 재검증: 정답을 가리고 지문만 보고 다시 풀게 함 → 정답 불일치·정답이 유일하지 않으면 그 문제를 버린다.
//  3. 살아남은 문제가 MIN_QUESTIONS 미만이면 그 학습은 보류(status: 보류)로 두고 의심 목록에 올린다.
// 한도(429)에 걸리면 지금까지 결과를 저장하고 멈춘다. 다시 실행하면 문제가 없는 학습부터 이어서 한다.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateQuestions, verifyQuestions } from './lib/gemini.mjs';

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(CURRENT_DIR, 'drafts', 'wiki');
const BATCH = 5;
const MIN_QUESTIONS = 2;
const MAX_QUESTIONS = 3;
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('GEMINI_API_KEY가 없습니다(.env).');
const redo = process.argv.includes('--redo');

const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const drafts = files.map((f) => ({ file: path.join(DIR, f), data: JSON.parse(readFileSync(path.join(DIR, f), 'utf8')) }));
const todo = drafts.filter((d) => redo || !d.data.questions?.length);
console.log(`문제를 만들 학습 ${todo.length}개 (Gemini 호출 예상 ${Math.ceil(todo.length / BATCH) * 2}회)`);

function save(d) {
  writeFileSync(d.file, JSON.stringify(d.data, null, 2) + '\n');
}

function shuffleChoices(q) {
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  const answerText = q.choices[q.answerIndex - 1];
  q.choices = order.map((i) => q.choices[i]);
  q.answerIndex = q.choices.indexOf(answerText) + 1;
}

function validShape(q) {
  return (
    typeof q?.question === 'string' && q.question &&
    Array.isArray(q.choices) && q.choices.length === 4 &&
    new Set(q.choices).size === 4 && q.choices.every((c) => typeof c === 'string' && c) &&
    Number.isInteger(q.answerIndex) && q.answerIndex >= 1 && q.answerIndex <= 4 &&
    typeof q.explanation === 'string' && /[\uac00-\ud7a3]/.test(q.explanation) // 해설은 한국어(한글 포함)여야 한다
  );
}

try {
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const generated = await generateQuestions(
      key,
      batch.map((d, n) => ({ id: String(n), text: d.data.passage.text })),
    );
    // 모양이 이상한 문제는 버리고, 선택지 순서를 섞어 정답 위치가 한쪽에 쏠리지 않게 한다
    const items = [];
    batch.forEach((d, n) => {
      const qs = (generated[String(n)] ?? []).filter(validShape).slice(0, MAX_QUESTIONS + 1);
      qs.forEach((q, m) => {
        shuffleChoices(q);
        items.push({ draft: d, q, id: `${n}-${m}` });
      });
    });
    const verified = await verifyQuestions(
      key,
      items.map((it) => ({ id: it.id, passage: it.draft.data.passage.text, question: it.q.question, choices: it.q.choices })),
    );
    for (const d of batch) {
      d.data.questions = [];
      d.data.questionLog = [];
    }
    for (const it of items) {
      const v = verified[it.id];
      const ok = v && v.answer === it.q.answerIndex && v.unique === true;
      if (ok && it.draft.data.questions.length < MAX_QUESTIONS) {
        it.draft.data.questions.push({ ...it.q, displayOrder: it.draft.data.questions.length + 1, verified: true });
      } else {
        it.draft.data.questionLog.push({
          dropped: it.q.question,
          reason: v ? `재검증 불일치(재검증 답 ${v.answer}, 정답 ${it.q.answerIndex}, 유일 ${v.unique}): ${v.reason}` : '재검증 응답 없음',
        });
      }
    }
    for (const d of batch) {
      const n = d.data.questions.length;
      d.data.suspects = (d.data.suspects ?? []).filter((s) => !s.startsWith('이해 문제'));
      if (n < MIN_QUESTIONS) {
        d.data.status = '보류';
        d.data.suspects.push(`이해 문제: 검증을 통과한 문제가 ${n}개뿐이라 이 학습은 보류`);
      } else {
        delete d.data.status;
        if (d.data.questionLog.length) d.data.suspects.push(`이해 문제: ${d.data.questionLog.length}개는 재검증에서 걸러짐(questionLog 참고)`);
      }
      save(d);
      console.log(`${d.data.title}: 문제 ${n}개 ${d.data.status ?? '통과'}`);
    }
  }
} catch (error) {
  console.error(`\n중단: ${error.message.slice(0, 300)}`);
  console.error('지금까지 만든 학습은 저장돼 있습니다. Gemini 한도(모델당 하루 20회)일 수 있습니다. 한도가 풀린 뒤 다시 실행하면 이어서 합니다.');
  process.exitCode = 1;
}
