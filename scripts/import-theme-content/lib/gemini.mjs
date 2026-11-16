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

/**
 * Tatoeba 일본어 예문을 한국어로 "옮기기만" 한다. 영어 번역(참고용)을 같이 줘서 뜻이 어긋나지 않게 한다.
 * items: {id, japanese, english}, 결과: {id: 한국어}. 초안이라 사람이 표본을 확인한다.
 */
export async function translateExamples(apiKey, items) {
  if (items.length === 0) return {};
  const prompt = `아래는 일본어 예문과, 그 영어 번역(참고용)이야. 일본어 문장을 자연스러운 한국어로
옮기기만 해줘. 영어 번역은 뜻을 확인하는 데만 쓰고, 내용을 더하거나 빼지 마.
${JSON.stringify(items)}
아래 JSON 형식으로만 응답해줘: {"<id>": "<한국어 번역>", ...}`;
  return extractJson(await callGemini(apiKey, prompt));
}

/**
 * 지문마다 JLPT N1~N3 독해 문제 초안(객관식 4지선다)을 만든다. 질문·보기는 일본어, 해설은 한국어.
 * passages: {id, text}. 결과: {"<id>": [{question, choices:[4], answerIndex(1~4), explanation}]}.
 */
export async function generateQuestions(apiKey, passages) {
  const prompt = `아래 일본어 지문마다 JLPT N1~N3 독해 시험 같은 객관식 문제를 3개씩 만들어줘.
- 질문과 보기 4개는 일본어(N1~N3 수준)로 쓴다. 정답은 보기 중 정확히 1개.
- 반드시 지문에 적힌 내용만으로 풀 수 있어야 하고, 배경지식이 필요하면 안 된다. 오답은 지문과 어긋나거나 지문에 없는 내용이어야 한다.
- 정답이 두 개 이상으로 읽힐 수 있는 보기는 만들지 마.
- 해설(explanation)은 한국어로, 정답인 이유와 근거가 되는 지문 속 문장을 짧게 적는다. "1번" 같은 보기 번호는 쓰지 말고 보기 내용으로 말한다.
- answerIndex는 1~4이고 문제마다 고르게 흩어지게 한다.
${JSON.stringify(passages)}
아래 JSON 형식으로만 응답해줘:
{"<id>": [{"question": "...", "choices": ["...", "...", "...", "..."], "answerIndex": 1, "explanation": "..."}]}`;
  return extractJson(await callGemini(apiKey, prompt));
}

/**
 * 만든 문제를 "정답을 가린 채" 다시 풀게 한다: 지문만 보고 정답을 고르고, 다른 보기도 정답이 될 수 있는지 판단.
 * items: {id, passage, question, choices}. 결과: {"<id>": {answer(1~4), unique(boolean), reason}}.
 */
export async function verifyQuestions(apiKey, items) {
  const prompt = `아래 각 항목은 일본어 지문과 객관식 문제야. 지문에 적힌 내용만 보고 풀어줘.
- answer: 정답이라고 생각하는 보기 번호(1~4)
- unique: 정답이 그 보기 하나뿐이면 true, 다른 보기도 지문 기준으로 맞을 수 있거나 정답이 없으면 false
- reason: 한국어로 한 줄
${JSON.stringify(items)}
아래 JSON 형식으로만 응답해줘: {"<id>": {"answer": 1, "unique": true, "reason": "..."}}`;
  return extractJson(await callGemini(apiKey, prompt));
}
