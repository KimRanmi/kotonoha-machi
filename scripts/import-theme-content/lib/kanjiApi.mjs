// kanjiapi.dev(KANJIDIC2 + JMdict, 무료, 키 불필요)로 한자·단어의 실제 뜻/읽는 법/JLPT 레벨을
// 조회한다. 이 파일은 "뜻을 지어내지 않는다"는 요구사항을 지키는 지점이다 — Gemini는 표기만
// 추천하고, 그 표기가 실제로 존재하는지·레벨이 뭔지는 전부 여기서 확인한다.

const BASE_URL = 'https://kanjiapi.dev/v1';
const KANJI_CODE_POINT_START = 0x4e00;
const KANJI_CODE_POINT_END = 0x9fff;

function isKanjiCharacter(character) {
  const codePoint = character.codePointAt(0);
  return codePoint >= KANJI_CODE_POINT_START && codePoint <= KANJI_CODE_POINT_END;
}

/** 한자 한 글자를 조회한다. 없으면 null. */
export async function fetchKanji(character) {
  const response = await fetch(`${BASE_URL}/kanji/${encodeURIComponent(character)}`);
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return {
    kanji: data.kanji,
    onReading: data.on_readings.join(', '),
    kunReading: data.kun_readings.join(', '),
    meaning: data.meanings.join(', '),
    jlptLevel: data.jlpt,
  };
}

/**
 * 단어 표기(surfaceForm)를 조회한다. kanjiapi.dev는 "그 글자가 들어간 모든 단어"를 주기 때문에,
 * surfaceForm과 완전히 같은 표기(variant.written)를 가진 항목만 고른다. 동음이의어가 여러 개면
 * priorities(자주 쓰이는 단어 표시)가 있는 쪽을 우선한다. 못 찾으면 null.
 */
export async function fetchWord(surfaceForm) {
  const firstCharacter = Array.from(surfaceForm)[0];
  const response = await fetch(`${BASE_URL}/words/${encodeURIComponent(firstCharacter)}`);
  if (!response.ok) {
    return null;
  }
  const entries = await response.json();
  const candidates = entries.flatMap((entry) =>
    entry.variants
      .filter((variant) => variant.written === surfaceForm)
      .map((variant) => ({ variant, meanings: entry.meanings })),
  );
  if (candidates.length === 0) {
    return null;
  }

  const best =
    candidates.find((candidate) => candidate.variant.priorities.length > 0) ?? candidates[0];
  return {
    surfaceForm: best.variant.written,
    reading: best.variant.pronounced,
    meaning: best.meanings.flatMap((meaning) => meaning.glosses).join(', '),
  };
}

/**
 * 단어의 JLPT 레벨을 구성 한자들 중 가장 어려운(숫자가 작은) 레벨로 계산한다(0012 결정과 같은
 * 방식). 한자가 하나도 없거나(순수 가나 단어) 레벨 데이터가 있는 한자가 없으면 null.
 */
export async function computeWordJlptLevel(surfaceForm) {
  const kanjiCharacters = Array.from(new Set(Array.from(surfaceForm).filter(isKanjiCharacter)));
  const levels = [];
  for (const character of kanjiCharacters) {
    const kanji = await fetchKanji(character);
    if (kanji?.jlptLevel) {
      levels.push(kanji.jlptLevel);
    }
  }
  return levels.length > 0 ? Math.min(...levels) : null;
}
