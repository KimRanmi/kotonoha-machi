import type { Theme } from "../types";

// 테마 데이터가 학습 흐름을 깨뜨리지 않는지 확인하는 작은 검사. 새 테스트 프레임워크 없이,
// 테마 목록(themes/index.ts)을 불러올 때 같이 실행돼서 개발·빌드 중에 바로 잡힌다.
// 일본어 내용의 정확성은 이 검사로 알 수 없다(구조만 본다).

const EXPECTED_ROUND_ORDER = ["kanji", "word", "expression", "example"];
const EXPECTED_ROUND_SIZES: Record<string, number> = { kanji: 3, word: 3, expression: 2, example: 2 };
const EXPECTED_REVIEW_COUNT = 2;
const HIRAGANA_ONLY = /^[぀-ゟ]+$/;

function normalize(text: string): string {
  return text.replace(/\s+/g, "");
}

export function validateThemes(themes: Theme[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const titles = new Set<string>();
  const itemIds = new Set<string>();

  themes.forEach((theme, themeIndex) => {
    const at = `[${theme.id}]`;
    if (ids.has(theme.id)) errors.push(`${at} 테마 id가 중복입니다.`);
    ids.add(theme.id);
    if (titles.has(theme.title)) errors.push(`${at} 테마 제목이 중복입니다: ${theme.title}`);
    titles.add(theme.title);

    // 해금 조건은 앞에 나온 테마만 가리킬 수 있다(순환·존재하지 않는 id 방지).
    for (const req of theme.requires) {
      const reqIndex = themes.findIndex((t) => t.id === req);
      if (reqIndex === -1) errors.push(`${at} requires에 없는 테마 id가 있습니다: ${req}`);
      else if (reqIndex >= themeIndex) errors.push(`${at} requires는 앞선 테마만 가리킬 수 있습니다: ${req}`);
    }

    const roundOrder = theme.rounds.map((r) => r.id);
    if (roundOrder.join() !== EXPECTED_ROUND_ORDER.join()) {
      errors.push(`${at} 라운드 순서가 한자→단어→표현→예문이 아닙니다: ${roundOrder.join(",")}`);
    }

    const correctPositions: number[] = [];
    for (const round of theme.rounds) {
      const expectedSize = EXPECTED_ROUND_SIZES[round.id];
      if (expectedSize !== undefined && round.items.length !== expectedSize) {
        errors.push(`${at} ${round.id} 라운드 문항 수가 ${round.items.length}개입니다(기대: ${expectedSize}).`);
      }
      for (const item of round.items) {
        const where = `${at} ${item.id}`;
        if (itemIds.has(`${theme.id}/${item.id}`)) errors.push(`${where} 문항 id가 중복입니다.`);
        itemIds.add(`${theme.id}/${item.id}`);
        if (!item.prompt.trim()) errors.push(`${where} prompt가 비었습니다.`);
        if (item.choices.length !== 4) errors.push(`${where} 선택지가 4개가 아닙니다.`);
        if (new Set(item.choices).size !== item.choices.length) errors.push(`${where} 선택지에 중복이 있습니다.`);
        const correctIndex = item.choices.indexOf(item.correct);
        if (correctIndex === -1) errors.push(`${where} 정답이 선택지 안에 없습니다.`);
        else correctPositions.push(correctIndex);
        if (!item.hint.includes(item.prompt.replace(/^〜/, "").replace(/。$/, ""))) {
          errors.push(`${where} 힌트에 문제(prompt)가 들어 있지 않습니다.`);
        }
        // 한자·단어 라운드의 정답은 "읽는 법 / 뜻" 형식이고, 힌트는 그 둘을 다 담아야 한다.
        if (round.id === "kanji" || round.id === "word") {
          const [reading, meaning] = item.correct.split(" / ");
          if (!reading || !meaning) errors.push(`${where} 정답이 "읽는 법 / 뜻" 형식이 아닙니다.`);
          else {
            if (!HIRAGANA_ONLY.test(reading)) errors.push(`${where} 읽는 법이 히라가나가 아닙니다: ${reading}`);
            if (!item.hint.includes(reading)) errors.push(`${where} 힌트에 읽는 법(${reading})이 없습니다.`);
            const firstMeaning = meaning.split(/[,(]/)[0].trim();
            if (!item.hint.includes(firstMeaning)) errors.push(`${where} 힌트에 뜻(${firstMeaning})이 없습니다.`);
          }
        } else if (!item.hint.includes(item.correct.replace(/\s*\(.*\)$/, ""))) {
          errors.push(`${where} 힌트에 정답이 들어 있지 않습니다.`);
        }
      }
    }
    // 정답이 한 자리에만 몰려 있으면 안 된다(전체 문항 중 같은 자리가 절반을 넘지 않게).
    const counts = [0, 1, 2, 3].map((p) => correctPositions.filter((c) => c === p).length);
    if (counts.some((c) => c > correctPositions.length / 2)) {
      errors.push(`${at} 정답 위치가 한 자리에 몰려 있습니다: ${counts.join("/")}`);
    }

    if (theme.review.length !== EXPECTED_REVIEW_COUNT) {
      errors.push(`${at} 종합 복습이 ${theme.review.length}문항입니다(기대: ${EXPECTED_REVIEW_COUNT}).`);
    }
    for (const q of theme.review) {
      const where = `${at} ${q.id}`;
      if (q.keywords.length === 0) errors.push(`${where} 키워드가 비었습니다.`);
      for (const k of q.keywords) {
        if (!k.trim()) errors.push(`${where} 빈 키워드가 있습니다.`);
        // 한 글자 히라가나는 조사(は, が, を …)처럼 흔해서 아무 답이나 통과시킨다.
        if (k.length < 2 && HIRAGANA_ONLY.test(k)) errors.push(`${where} 너무 흔한 키워드입니다: ${k}`);
        // 로마자 입력에서 맨 끝의 단독 n은 ん으로 바뀌지 않는다("irimasen" → いりませn). ん으로 끝나면 답 끝에서 못 맞춘다.
        if (HIRAGANA_ONLY.test(k) && k.endsWith("ん")) errors.push(`${where} ん으로 끝나는 히라가나 키워드는 로마자 입력으로 맞추기 어렵습니다: ${k}`);
        if (/^(から|まで|です|ます|ので|ですが)$/.test(k)) errors.push(`${where} 너무 흔한 키워드입니다: ${k}`);
      }
      // 로마자 입력으로는 히라가나만 만들 수 있으므로, 히라가나만으로 된 키워드가 하나는 있어야 한다.
      if (!q.keywords.some((k) => HIRAGANA_ONLY.test(k))) {
        errors.push(`${where} 히라가나만으로 된 키워드가 없어 로마자 입력으로는 정답이 될 수 없습니다.`);
      }
      const sample = normalize(q.sampleAnswer);
      if (!sample) errors.push(`${where} 예시 답안이 비었습니다.`);
      else if (!q.keywords.some((k) => sample.includes(normalize(k)))) {
        errors.push(`${where} 예시 답안이 자기 키워드로 정답 판정되지 않습니다.`);
      }
    }
  });

  return errors;
}

export function assertThemesValid(themes: Theme[]): void {
  const errors = validateThemes(themes);
  if (errors.length > 0) {
    throw new Error(`테마 데이터 오류:\n${errors.join("\n")}`);
  }
}
