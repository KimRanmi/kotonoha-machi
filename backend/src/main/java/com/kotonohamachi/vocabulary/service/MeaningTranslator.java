package com.kotonohamachi.vocabulary.service;

import com.kotonohamachi.chat.service.GeminiClient;
import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.vocabulary.dto.DictionaryWord;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 사전의 영어 뜻을 한국어로 옮긴다. 번역만 AI가 하고 뜻은 사전 것이다. Gemini 무료 한도가 빠듯해 같은 단어는 한 번만 번역해
 * 메모리에 두고, Gemini가 실패하면(한도 초과 포함) 영어 뜻을 그대로 쓴다.
 */
@Component
public class MeaningTranslator {

  private static final Logger log = LoggerFactory.getLogger(MeaningTranslator.class);
  /** 캐시가 끝없이 커지지 않게 하는 상한. 넘으면 비우고 다시 쌓는다. */
  private static final int MAX_CACHE_SIZE = 1000;

  private final GeminiClient geminiClient;
  private final Map<DictionaryWord, String> cache = new ConcurrentHashMap<>();

  /**
   * 생성자.
   *
   * @param geminiClient Gemini 클라이언트
   */
  public MeaningTranslator(GeminiClient geminiClient) {
    this.geminiClient = geminiClient;
  }

  /**
   * 사전 단어의 뜻을 한국어로 돌려준다.
   *
   * @param word 사전에서 찾은 단어
   * @return 한국어 뜻. 번역에 실패하면 영어 뜻 그대로
   */
  public String toKorean(DictionaryWord word) {
    String cached = cache.get(word);
    if (cached != null) {
      return cached;
    }
    try {
      String korean = geminiClient.translateMeaning(word);
      if (cache.size() >= MAX_CACHE_SIZE) {
        cache.clear();
      }
      cache.put(word, korean);
      return korean;
    } catch (ApiException e) {
      log.warn("뜻 번역 실패, 영어 뜻을 그대로 저장합니다: {}", e.getMessage());
      return word.englishMeaning();
    }
  }
}
