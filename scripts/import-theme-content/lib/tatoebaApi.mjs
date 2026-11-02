// Tatoeba(CC BY, 무료, 키 불필요)에서 실제 일본어 예문과 한국어 번역 쌍을 검색한다. 예문 자체는
// 여기서 지어내지 않는다 — Gemini가 검색 키워드만 추천하고, 실제 문장은 이 API에서 가져온다.

const BASE_URL = 'https://tatoeba.org/eng/api_v0/search';

/** 일본어 키워드로 한국어 번역이 있는 예문을 검색한다. 못 찾으면 null. */
export async function searchJapaneseExample(query) {
  const url = `${BASE_URL}?from=jpn&to=kor&query=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  for (const result of data.results ?? []) {
    const koreanTranslation = result.translations
      .flat()
      .find((translation) => translation.lang_tag === 'ko');
    if (koreanTranslation) {
      return { japaneseSentence: result.text, translation: koreanTranslation.text };
    }
  }
  return null;
}
