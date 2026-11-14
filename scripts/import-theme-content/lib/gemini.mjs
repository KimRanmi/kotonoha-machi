// Gemini는 "이 테마에 어울리는 단어가 뭘지" 후보 표기만 추천한다. 뜻/읽는 법/레벨은 여기서 절대
// 만들지 않고, kanjiApi.mjs가 실제 사전 데이터로 조회·검증한다 — docs/requirements.md의
// "AI가 뜻을 짓지 않는다" 제약을 지키는 지점이다.

const MODEL = 'gemini-3.5-flash-lite';

async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API 호출 실패(${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini 응답에서 텍스트를 찾지 못했습니다: ${JSON.stringify(data)}`);
  }
  return text;
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Gemini 응답에서 JSON을 찾지 못했습니다: ${text}`);
  }
  return JSON.parse(match[0]);
}

/** 테마 제목·주제에 어울리는 한자 3개, 단어 3개, 표현 2개의 "표기"만 추천받는다. */
export async function suggestCandidates(apiKey, title, topic) {
  const prompt = `일본어 학습 게임의 테마 "${title}"(주제: ${topic})에 어울리는 JLPT N1~N3 수준의
실제 일본어 한자 8개, 단어(WORD) 8개, 표현(EXPRESSION) 6개를 추천해줘.
- 한자는 반드시 한 글자씩만, 단어는 일본어 사전에 올라 있는 단어만, 표현은 사전에 올라 있는
  짧은 관용구·정형구만 적어줘(문장 금지).
- 반드시 실제로 존재하는 일본어 단어의 표기만 적어줘(지어내지 말 것).
- 뜻이나 읽는 법은 적지 말고 표기만 적어줘(별도로 조회할 거야).
- 아래 JSON 형식으로만, 다른 설명 없이 응답해줘.
{"kanji": ["..."], "word": ["..."], "expression": ["..."]}`;

  return extractJson(await callGemini(apiKey, prompt));
}

/** 선택된 단어 목록 중에서 Tatoeba 검색에 쓸 키워드 2개를 추천받는다(예문 자체를 짓지 않음). */
export async function suggestExampleSearchKeywords(apiKey, title, vocabularyWords) {
  const prompt = `일본어 학습 게임의 테마 "${title}"에서 다음 단어들을 배운 뒤 보여줄 예문을
Tatoeba(실제 문장 코퍼스)에서 검색하려고 해. 검색에 쓸 일본어 단어 2개를 아래 목록 중에서만
골라줘(새로 짓지 말 것).
목록: ${vocabularyWords.join(', ')}
아래 JSON 형식으로만 응답해줘.
{"keywords": ["...", "..."]}`;

  return extractJson(await callGemini(apiKey, prompt)).keywords;
}

/**
 * 영어 사전 뜻을 한국어로 "옮기기만" 한다(새 뜻을 짓지 않음). items는 {id, english} 배열이고,
 * {id: 한국어} 객체를 돌려준다. 결과는 초안일 뿐이라 사람이 검수해야 한다(0012 참고).
 */
export async function translateMeanings(apiKey, items) {
  if (items.length === 0) {
    return {};
  }
  const prompt = `아래는 일본어 사전(JMdict/KANJIDIC2)의 영어 뜻이야. 각 영어 뜻을 자연스러운 한국어로
옮기기만 해줘. 새로운 뜻을 추가하거나 빼지 말고, 쉼표로 구분된 뜻은 같은 순서로 쉼표로 구분해서
간결하게(최대 3개 정도로 줄여도 됨) 옮겨줘.
${JSON.stringify(items)}
아래 JSON 형식으로만 응답해줘: {"<id>": "<한국어 뜻>", ...}`;
  return extractJson(await callGemini(apiKey, prompt));
}
