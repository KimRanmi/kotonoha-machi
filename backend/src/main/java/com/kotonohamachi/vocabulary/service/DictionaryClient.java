package com.kotonohamachi.vocabulary.service;

import com.kotonohamachi.common.ApiException;
import com.kotonohamachi.vocabulary.VocabularyErrorCode;
import com.kotonohamachi.vocabulary.dto.DictionaryWord;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * jisho.org 공개 API(JMdict 기반)로 단어의 읽는 법·영어 뜻·JLPT 레벨을 조회한다. 뜻은 AI가 짓지 않고 사전 데이터를 그대로 쓴다.
 * 사전 데이터 출처: JMdict (CC BY-SA 4.0).
 */
@Component
public class DictionaryClient {

  private static final Logger log = LoggerFactory.getLogger(DictionaryClient.class);
  private static final String ENDPOINT = "https://jisho.org/api/v1/search/words";
  private static final JsonMapper JSON_MAPPER = JsonMapper.builder().build();
  private static final Pattern JLPT_TAG = Pattern.compile("jlpt-n([1-5])");
  private static final int MAX_DEFINITIONS = 3;
  /** 영어 뜻 길이 상한. 번역 실패 시 그대로 저장돼도 단어장 meaning 컬럼(300자)을 넘지 않게 한다. */
  static final int MAX_MEANING_LENGTH = 200;

  private final RestClient restClient;

  /** 생성자. */
  public DictionaryClient() {
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(Duration.ofSeconds(5));
    requestFactory.setReadTimeout(Duration.ofSeconds(8));
    this.restClient = RestClient.builder().requestFactory(requestFactory).build();
  }

  /**
   * 표기가 정확히 일치하는 단어를 사전에서 찾는다.
   *
   * @param word 사용자가 고른 일본어 표기
   * @return 찾은 단어. 사전에 없으면 빈 값
   * @throws ApiException 사전 서버에 연결하지 못했거나 응답이 이상한 경우(502)
   */
  public Optional<DictionaryWord> lookup(String word) {
    String body;
    try {
      body =
          restClient.get().uri(ENDPOINT + "?keyword={keyword}", word).retrieve().body(String.class);
    } catch (RestClientException e) {
      log.error("사전 조회 실패: {}", e.getClass().getSimpleName());
      throw new ApiException(VocabularyErrorCode.DICTIONARY_UNAVAILABLE);
    }
    if (body == null || body.isBlank()) {
      log.error("사전 응답 본문이 비어 있습니다.");
      throw new ApiException(VocabularyErrorCode.DICTIONARY_UNAVAILABLE);
    }
    try {
      return parse(body, word);
    } catch (JacksonException e) {
      log.error("사전 응답을 해석하지 못했습니다.");
      throw new ApiException(VocabularyErrorCode.DICTIONARY_UNAVAILABLE);
    }
  }

  /**
   * 사전 응답에서 표기(한자 표기 또는 가나만 있는 단어의 읽는 법)가 {@code word}와 정확히 같은 첫 항목을 고른다. 비슷한 단어를
   * 엉뚱하게 저장하지 않으려고 부분 일치는 받지 않는다.
   */
  static Optional<DictionaryWord> parse(String body, String word) {
    JsonNode data = JSON_MAPPER.readTree(body).path("data");
    for (JsonNode item : data) {
      for (JsonNode japanese : item.path("japanese")) {
        String itemWord = japanese.path("word").asString("");
        String reading = japanese.path("reading").asString("");
        boolean matches = itemWord.isEmpty() ? reading.equals(word) : itemWord.equals(word);
        if (matches && !reading.isEmpty()) {
          String meaning = englishMeaning(item.path("senses"));
          if (meaning.isEmpty()) {
            continue;
          }
          return Optional.of(new DictionaryWord(word, reading, meaning, jlptLevel(item)));
        }
      }
    }
    return Optional.empty();
  }

  /** 위키백과 설명을 뺀 첫 번째 뜻풀이의 영어 정의를 최대 3개까지 쉼표로 잇는다. */
  private static String englishMeaning(JsonNode senses) {
    for (JsonNode sense : senses) {
      boolean isWikipedia = false;
      for (JsonNode part : sense.path("parts_of_speech")) {
        isWikipedia |= "Wikipedia definition".equals(part.asString(""));
      }
      if (isWikipedia) {
        continue;
      }
      List<String> definitions = new ArrayList<>();
      for (JsonNode definition : sense.path("english_definitions")) {
        if (definitions.size() < MAX_DEFINITIONS) {
          definitions.add(definition.asString(""));
        }
      }
      if (!definitions.isEmpty()) {
        String joined = String.join(", ", definitions);
        return joined.length() > MAX_MEANING_LENGTH
            ? joined.substring(0, MAX_MEANING_LENGTH)
            : joined;
      }
    }
    return "";
  }

  /** "jlpt-n5" 같은 태그에서 JLPT 레벨을 읽는다. 여럿이면 쉬운 쪽(숫자가 큰 쪽)을 쓴다. */
  private static Integer jlptLevel(JsonNode item) {
    Integer level = null;
    for (JsonNode tag : item.path("jlpt")) {
      Matcher matcher = JLPT_TAG.matcher(tag.asString(""));
      if (matcher.matches()) {
        int parsed = Integer.parseInt(matcher.group(1));
        level = level == null ? parsed : Math.max(level, parsed);
      }
    }
    return level;
  }
}
